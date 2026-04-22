import type { AuthenticationPort } from '#core/user_management/domain/authentication'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { DemoDatasetService } from '#core/accounting/application/demo/demo_dataset_service'
import { systemAccessContext } from '#core/accounting/application/support/access_context'
import * as schema from '#core/common/drizzle/index'
import { DomainError } from '#core/common/errors/domain_error'
import { eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

const TENANT_WORDS = [
  'amber',
  'atlas',
  'brisk',
  'cedar',
  'delta',
  'ember',
  'forge',
  'granite',
  'harbor',
  'ion',
  'juniper',
  'keystone',
  'linen',
  'meadow',
  'nova',
  'orchard',
  'pivot',
  'quartz',
  'ridge',
  'summit',
] as const

export interface CreateDevTenantInput {
  ownerEmail: string
  ownerPassword: string
  seedMode: 'empty' | 'seeded'
  tenantName: string
}

export interface CreateDevTenantResult {
  ownerUserId: string
  tenantId: string
  tenantName: string
  tenantSlug: string
}

export class DevOperatorTenantFactoryService {
  constructor(
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly demoDatasetService: DemoDatasetService = new DemoDatasetService(db)
  ) {}

  async createTenant(
    input: CreateDevTenantInput,
    auth: AuthenticationPort
  ): Promise<CreateDevTenantResult> {
    const ownerEmail = input.ownerEmail.trim().toLowerCase()
    const tenantName = input.tenantName.trim() || buildReadableTenantLabel()
    const ownerDisplayName = buildOwnerDisplayName(ownerEmail)

    const [existingUser] = await this.db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, ownerEmail))
      .limit(1)

    if (existingUser) {
      throw new DomainError('Owner email is already used by another account.', 'invalid_data')
    }

    const authentication = await auth.signUp(ownerEmail, input.ownerPassword, ownerDisplayName)

    const tenantId = uuidv7()
    const tenantSlug = await this.allocateReadableSlug()
    let bootstrapSessionDeleted = false
    try {
      await this.db.transaction(async (tx) => {
        await tx.insert(schema.organization).values({
          createdAt: new Date(),
          id: tenantId,
          logo: null,
          metadata: JSON.stringify({
            createdBy: 'dev_operator_console',
            seedMode: input.seedMode,
          }),
          name: tenantName,
          slug: tenantSlug,
        })

        await tx.insert(schema.member).values({
          createdAt: new Date(),
          id: uuidv7(),
          isActive: true,
          organizationId: tenantId,
          role: 'owner',
          userId: authentication.user.id,
        })
        if (input.seedMode === 'seeded') {
          await this.demoDatasetService.seedTenantInTransaction(
            tx,
            systemAccessContext(tenantId, 'dev-tenant-factory')
          )
        }
      })
    } catch (error) {
      await this.deleteBootstrapSession(authentication.session.token)
      bootstrapSessionDeleted = true
      await this.cleanupBootstrapUser(authentication.user.id)
      throw error
    } finally {
      if (!bootstrapSessionDeleted) {
        await this.deleteBootstrapSession(authentication.session.token)
      }
    }

    return {
      ownerUserId: authentication.user.id,
      tenantId,
      tenantName,
      tenantSlug,
    }
  }

  private async allocateReadableSlug(): Promise<string> {
    let slug = buildReadableTenantSlug()

    for (let attempt = 0; attempt < 8; attempt++) {
      const [existing] = await this.db
        .select({ id: schema.organization.id })
        .from(schema.organization)
        .where(eq(schema.organization.slug, slug))
        .limit(1)

      if (!existing) {
        return slug
      }

      slug = buildReadableTenantSlug()
    }

    return `dev-${uuidv7().slice(0, 8)}`
  }

  private async deleteBootstrapSession(sessionToken: string): Promise<void> {
    await this.db.delete(schema.session).where(eq(schema.session.token, sessionToken))
  }

  private async cleanupBootstrapUser(userId: string): Promise<void> {
    const [remainingMember] = await this.db
      .select({ id: schema.member.id })
      .from(schema.member)
      .where(eq(schema.member.userId, userId))
      .limit(1)

    const [remainingSession] = await this.db
      .select({ id: schema.session.id })
      .from(schema.session)
      .where(eq(schema.session.userId, userId))
      .limit(1)

    const [remainingGrant] = await this.db
      .select({ userId: schema.devOperatorAccess.userId })
      .from(schema.devOperatorAccess)
      .where(eq(schema.devOperatorAccess.userId, userId))
      .limit(1)

    if (remainingMember || remainingSession || remainingGrant) {
      return
    }

    await this.db.delete(schema.user).where(eq(schema.user.id, userId))
  }
}

function buildOwnerDisplayName(email: string): string {
  const base = email.split('@')[0]?.trim() || 'Owner'
  return base
    .split(/[._-]+/)
    .filter((part) => part.length > 0)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

function buildReadableTenantLabel(): string {
  const [a, b, c] = pickTenantWords()
  return `${capitalize(a)} ${capitalize(b)} ${capitalize(c)}`
}

function buildReadableTenantSlug(): string {
  const [a, b, c] = pickTenantWords()
  const suffix = Math.floor(100 + Math.random() * 900)
  return `${a}-${b}-${c}-${suffix}`
}

function capitalize(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`
}

function pickTenantWords(): [string, string, string] {
  const first = randomWord()
  let second = randomWord()
  let third = randomWord()

  while (second === first) {
    second = randomWord()
  }

  while (third === first || third === second) {
    third = randomWord()
  }

  return [first, second, third]
}

function randomWord(): string {
  return TENANT_WORDS[Math.floor(Math.random() * TENANT_WORDS.length)]!
}

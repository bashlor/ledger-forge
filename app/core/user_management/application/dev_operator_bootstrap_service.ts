import type { AuthenticationPort, AuthResult } from '#core/user_management/domain/authentication'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import * as schema from '#core/common/drizzle/index'
import { provisionPersonalWorkspace } from '#core/user_management/application/workspace_provisioning'
import { readDevOperatorBootstrapDefaults } from '#core/user_management/support/dev_operator'
import { and, eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

export interface DevOperatorBootstrapInput {
  email: string
  fullName?: null | string
  password: string
}

export class DevOperatorBootstrapService {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async bootstrap(input: DevOperatorBootstrapInput, auth: AuthenticationPort): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase()
    const fullName = input.fullName?.trim() || undefined

    const [existingUser] = await this.db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, email))
      .limit(1)

    const authentication = existingUser
      ? await auth.signIn(email, input.password)
      : await auth.signUp(email, input.password, fullName)

    const persisted = await this.ensurePersistedAuthArtifacts(authentication, { email, fullName })

    await this.db
      .insert(schema.devOperatorAccess)
      .values({ userId: persisted.user.id })
      .onConflictDoNothing()

    await provisionPersonalWorkspace(this.db, {
      displayName: fullName ?? persisted.user.name ?? undefined,
      email,
      isAnonymous: false,
      sessionToken: persisted.session.token,
      userId: persisted.user.id,
    })

    return (await auth.getSession(persisted.session.token)) ?? persisted
  }

  defaults() {
    return readDevOperatorBootstrapDefaults()
  }

  private async ensurePersistedAuthArtifacts(
    authentication: AuthResult,
    input: { email: string; fullName?: string }
  ): Promise<AuthResult> {
    const [userById] = await this.db
      .select({
        email: schema.user.email,
        id: schema.user.id,
        image: schema.user.image,
        isAnonymous: schema.user.isAnonymous,
        name: schema.user.name,
        publicId: schema.user.publicId,
      })
      .from(schema.user)
      .where(eq(schema.user.id, authentication.user.id))
      .limit(1)

    const [userByEmail] = await this.db
      .select({
        email: schema.user.email,
        id: schema.user.id,
        image: schema.user.image,
        isAnonymous: schema.user.isAnonymous,
        name: schema.user.name,
        publicId: schema.user.publicId,
      })
      .from(schema.user)
      .where(eq(schema.user.email, input.email))
      .limit(1)

    const matchingUserById = userById?.email === input.email ? userById : null
    const insertUserId = userById && !matchingUserById ? uuidv7() : authentication.user.id
    const insertPublicId =
      userById && !matchingUserById
        ? `pub_${uuidv7().replaceAll('-', '')}`
        : authentication.user.publicId || `pub_${uuidv7().replaceAll('-', '')}`
    const persistedUser =
      userByEmail ??
      matchingUserById ??
      (
        await this.db
          .insert(schema.user)
          .values({
            email: input.email,
            emailVerified: authentication.user.emailVerified,
            id: insertUserId,
            image: authentication.user.image,
            isAnonymous: authentication.user.isAnonymous,
            name: input.fullName ?? authentication.user.name ?? input.email,
            publicId: insertPublicId,
          })
          .returning({
            email: schema.user.email,
            id: schema.user.id,
            image: schema.user.image,
            isAnonymous: schema.user.isAnonymous,
            name: schema.user.name,
            publicId: schema.user.publicId,
          })
      )[0]

    const [sessionRow] = await this.db
      .select({
        activeOrganizationId: schema.session.activeOrganizationId,
        id: schema.session.id,
        userId: schema.session.userId,
      })
      .from(schema.session)
      .where(eq(schema.session.token, authentication.session.token))
      .limit(1)

    if (sessionRow) {
      const shouldClearActiveOrganization =
        sessionRow.userId !== persistedUser.id ||
        !(await this.hasUsableActiveOrganization(persistedUser.id, sessionRow.activeOrganizationId))

      await this.db
        .update(schema.session)
        .set({
          activeOrganizationId: shouldClearActiveOrganization
            ? null
            : sessionRow.activeOrganizationId,
          expiresAt: authentication.session.expiresAt,
          userId: persistedUser.id,
        })
        .where(eq(schema.session.token, authentication.session.token))
    } else {
      await this.db.insert(schema.session).values({
        activeOrganizationId: null,
        expiresAt: authentication.session.expiresAt,
        id: uuidv7(),
        token: authentication.session.token,
        userId: persistedUser.id,
      })
    }

    return {
      session: {
        ...authentication.session,
        userId: persistedUser.id,
      },
      user: {
        ...authentication.user,
        email: persistedUser.email,
        id: persistedUser.id,
        image: persistedUser.image,
        isAnonymous: persistedUser.isAnonymous,
        name: persistedUser.name,
        publicId: persistedUser.publicId,
      },
    }
  }

  private async hasUsableActiveOrganization(
    userId: string,
    organizationId: null | string
  ): Promise<boolean> {
    if (!organizationId) {
      return false
    }

    const [membership] = await this.db
      .select({ organizationId: schema.member.organizationId })
      .from(schema.member)
      .innerJoin(schema.organization, eq(schema.member.organizationId, schema.organization.id))
      .where(and(eq(schema.member.userId, userId), eq(schema.member.organizationId, organizationId)))
      .limit(1)

    return Boolean(membership)
  }
}

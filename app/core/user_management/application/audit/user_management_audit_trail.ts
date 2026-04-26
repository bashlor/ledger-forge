import type { AuditDbExecutor } from '#core/accounting/application/audit/critical_audit_trail'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { DatabaseCriticalAuditTrail } from '#core/accounting/application/audit/critical_audit_trail'
import * as schema from '#core/common/drizzle/index'
import { eq } from 'drizzle-orm'
import { createHash } from 'node:crypto'

interface AuthFailureInput {
  email?: null | string
  error: unknown
}

interface AuthSessionAuditContext {
  activeOrganizationId: null | string
  sessionId: null | string
  userId: null | string
}

interface AuthSuccessInput {
  isAnonymous: boolean
  sessionToken: string
  userId: string
}

interface MemberProvisionedInput {
  actorId: string
  isActive: boolean
  memberId: string
  role: string
  source: 'workspace_provisioning'
  tenantId: string
  workspaceMode: 'personal' | 'single_tenant'
}

interface MemberRoleChangedInput {
  actorId: string
  afterRole: string
  beforeRole: string
  memberId: string
  memberUserId: string
  tenantId: string
}

interface SessionWorkspaceChangedInput {
  actorId: string
  afterOrganizationId: string
  beforeOrganizationId: null | string
  sessionId: string
  source: 'workspace_provisioning' | 'workspace_session'
}

interface SignOutInput {
  context: AuthSessionAuditContext
  isAnonymous: boolean
}

export class UserManagementAuditTrail {
  private readonly auditTrail = new DatabaseCriticalAuditTrail()

  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async recordActiveWorkspaceChanged(
    tx: AuditDbExecutor,
    input: SessionWorkspaceChangedInput
  ): Promise<void> {
    await this.auditTrail.record(tx, {
      action: 'session_active_organization_changed',
      actorId: input.actorId,
      changes: {
        after: { activeOrganizationId: input.afterOrganizationId },
        before: { activeOrganizationId: input.beforeOrganizationId },
      },
      entityId: input.sessionId,
      entityType: 'session',
      metadata: { source: input.source },
      tenantId: input.afterOrganizationId,
    })
  }

  async recordMemberProvisioned(tx: AuditDbExecutor, input: MemberProvisionedInput): Promise<void> {
    await this.auditTrail.record(tx, {
      action: 'member_workspace_provisioned',
      actorId: input.actorId,
      changes: {
        after: { isActive: input.isActive, role: input.role },
        before: { isActive: null, role: null },
      },
      entityId: input.memberId,
      entityType: 'member',
      metadata: {
        source: input.source,
        workspaceMode: input.workspaceMode,
      },
      tenantId: input.tenantId,
    })
  }

  async recordMemberRoleChanged(tx: AuditDbExecutor, input: MemberRoleChangedInput): Promise<void> {
    await this.auditTrail.record(tx, {
      action: 'member_role_changed',
      actorId: input.actorId,
      changes: {
        after: { role: input.afterRole },
        before: { role: input.beforeRole },
      },
      entityId: input.memberId,
      entityType: 'member',
      metadata: {
        memberUserId: input.memberUserId,
      },
      tenantId: input.tenantId,
    })
  }

  async recordSignInFailure(input: AuthFailureInput): Promise<void> {
    await this.auditTrail.record(this.db, {
      action: 'sign_in_failure',
      actorId: null,
      entityId: 'authentication',
      entityType: 'auth',
      metadata: {
        emailHash: input.email ? hashAuditIdentifier(input.email.trim().toLowerCase()) : null,
        errorName: input.error instanceof Error ? input.error.name : 'UnknownError',
        source: 'better_auth',
      },
      tenantId: null,
    })
  }

  async recordSignInSuccess(input: AuthSuccessInput): Promise<void> {
    const context = await this.resolveSessionContext(input.sessionToken)

    await this.auditTrail.record(this.db, {
      action: 'sign_in_success',
      actorId: input.userId,
      entityId: context.sessionId ?? input.userId,
      entityType: 'auth',
      metadata: {
        isAnonymous: input.isAnonymous,
        sessionId: context.sessionId,
        source: 'better_auth',
      },
      tenantId: context.activeOrganizationId,
    })
  }

  async recordSignOutFailure(input: AuthFailureInput & SignOutInput): Promise<void> {
    await this.auditTrail.record(this.db, {
      action: 'sign_out_failure',
      actorId: input.context.userId,
      entityId: input.context.sessionId ?? input.context.userId ?? 'authentication',
      entityType: 'auth',
      metadata: {
        errorName: input.error instanceof Error ? input.error.name : 'UnknownError',
        isAnonymous: input.isAnonymous,
        sessionId: input.context.sessionId,
        source: 'better_auth',
      },
      tenantId: input.context.activeOrganizationId,
    })
  }

  async recordSignOutSuccess(input: SignOutInput): Promise<void> {
    await this.auditTrail.record(this.db, {
      action: 'sign_out_success',
      actorId: input.context.userId,
      entityId: input.context.sessionId ?? input.context.userId ?? 'authentication',
      entityType: 'auth',
      metadata: {
        isAnonymous: input.isAnonymous,
        sessionId: input.context.sessionId,
        source: 'better_auth',
      },
      tenantId: input.context.activeOrganizationId,
    })
  }

  async resolveSessionContext(sessionToken: null | string): Promise<AuthSessionAuditContext> {
    if (!sessionToken) {
      return { activeOrganizationId: null, sessionId: null, userId: null }
    }

    const [sessionRow] = await this.db
      .select({
        activeOrganizationId: schema.session.activeOrganizationId,
        id: schema.session.id,
        userId: schema.session.userId,
      })
      .from(schema.session)
      .where(eq(schema.session.token, sessionToken))
      .limit(1)

    return {
      activeOrganizationId: sessionRow?.activeOrganizationId ?? null,
      sessionId: sessionRow?.id ?? null,
      userId: sessionRow?.userId ?? null,
    }
  }
}

function hashAuditIdentifier(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

import type { MemberRole } from '#core/user_management/application/member_service'

export type AuthorizationAbility =
  | 'accounting.read'
  | 'accounting.writeDrafts'
  | 'auditTrail.view'
  | 'devTools.access'
  | 'invoice.issue'
  | 'invoice.markPaid'
  | 'membership.changeRole'
  | 'membership.list'
  | 'membership.toggleActive'

export interface AuthorizationActor {
  activeTenantId: null | string
  isDevOperator: boolean
  membershipIsActive: boolean
  membershipRole: MemberRole | null
  userId: null | string
}

export type AuthorizationSubject = MembershipAuthorizationSubject

export interface MembershipAuthorizationSubject {
  id: string
  isActive: boolean
  role: MemberRole
  tenantId: string
  userId: string
}

const MEMBER_ABILITIES: readonly AuthorizationAbility[] = [
  'accounting.read',
  'accounting.writeDrafts',
]

const ADMIN_ABILITIES: readonly AuthorizationAbility[] = [
  ...MEMBER_ABILITIES,
  'auditTrail.view',
  'invoice.issue',
  'invoice.markPaid',
  'membership.list',
]

const OWNER_ABILITIES: readonly AuthorizationAbility[] = [
  ...ADMIN_ABILITIES,
  'membership.changeRole',
]

// Membership mutations depend on the target membership and stay in the switch below
// instead of the flat ability arrays.

export function can(
  actor: AuthorizationActor,
  ability: AuthorizationAbility,
  subject?: AuthorizationSubject
): boolean {
  if (ability === 'devTools.access') {
    return actor.isDevOperator
  }

  if (!actor.activeTenantId || !actor.membershipIsActive || !actor.membershipRole) {
    return false
  }

  switch (ability) {
    case 'membership.changeRole':
      return canChangeMembershipRole(actor, subject)
    case 'membership.toggleActive':
      return canToggleMembership(actor, subject)
    default:
      return allowedAbilitiesForRole(actor.membershipRole).includes(ability)
  }
}

function allowedAbilitiesForRole(role: MemberRole): readonly AuthorizationAbility[] {
  switch (role) {
    case 'admin':
      return ADMIN_ABILITIES
    case 'member':
      return MEMBER_ABILITIES
    case 'owner':
      return OWNER_ABILITIES
  }
}

function canChangeMembershipRole(
  actor: AuthorizationActor,
  subject?: AuthorizationSubject
): boolean {
  if (actor.membershipRole !== 'owner') {
    return false
  }

  if (!subject) {
    return true
  }

  return subject.role !== 'owner'
}

function canToggleMembership(actor: AuthorizationActor, subject?: AuthorizationSubject): boolean {
  if (!subject) {
    return actor.membershipRole === 'admin' || actor.membershipRole === 'owner'
  }

  if (subject.role === 'owner' || subject.userId === actor.userId) {
    return false
  }

  if (actor.membershipRole === 'owner') {
    return true
  }

  return actor.membershipRole === 'admin' && subject.role === 'member'
}

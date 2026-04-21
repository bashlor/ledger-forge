import vine from '@vinejs/vine'

/**
 * Validator for toggling a member's active status.
 */
export const toggleMemberStatusValidator = vine.compile(
  vine.object({
    isActive: vine.boolean(),
  })
)

export const updateMemberRoleValidator = vine.compile(
  vine.object({
    role: vine.enum(['admin', 'member'] as const),
  })
)

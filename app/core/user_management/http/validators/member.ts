import vine from '@vinejs/vine'

/**
 * Validator for toggling a member's active status.
 */
export const toggleMemberStatusValidator = vine.compile(
  vine.object({
    isActive: vine.boolean(),
  })
)

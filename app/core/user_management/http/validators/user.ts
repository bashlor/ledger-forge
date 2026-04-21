import vine from '@vinejs/vine'

/**
 * Shared rules for email and password.
 */
const email = () => vine.string().email().maxLength(254).trim()
const password = () => vine.string().minLength(8).maxLength(128)

/**
 * Validator for self-signup.
 * Uniqueness is enforced by Better Auth — no DB query here.
 */
export const signupValidator = vine.compile(
  vine.object({
    email: email(),
    fullName: vine.string().maxLength(255).trim().nullable(),
    password: password().confirmed({
      confirmationField: 'passwordConfirmation',
    }),
  })
)

/**
 * Validator for login.
 */
export const loginValidator = vine.compile(
  vine.object({
    email: email(),
    password: vine.string().maxLength(128),
  })
)

/**
 * Validator for forgot-password (request reset).
 */
export const forgotPasswordValidator = vine.compile(
  vine.object({
    email: email(),
  })
)

/**
 * Validator for reset-password (set new password with token).
 */
export const resetPasswordValidator = vine.compile(
  vine.object({
    newPassword: password(),
    token: vine.string().minLength(1).maxLength(512),
  })
)

/**
 * Validator for account profile update.
 */
export const updateProfileValidator = vine.compile(
  vine.object({
    name: vine.string().maxLength(255).trim(),
  })
)

/**
 * Validator for account password change.
 */
export const changePasswordValidator = vine.compile(
  vine.object({
    currentPassword: vine.string().maxLength(128),
    newPassword: password().confirmed({
      confirmationField: 'newPasswordConfirmation',
    }),
  })
)

/**
 * Validator for local dev-operator bootstrap.
 */
export const devOperatorBootstrapValidator = vine.compile(
  vine.object({
    email: email(),
    fullName: vine.string().maxLength(255).trim().nullable(),
    password: password().confirmed({
      confirmationField: 'passwordConfirmation',
    }),
  })
)

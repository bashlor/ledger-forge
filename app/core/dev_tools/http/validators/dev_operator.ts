import vine from '@vinejs/vine'

const email = () => vine.string().email().maxLength(254).trim()
const password = () => vine.string().minLength(8).maxLength(128)

export const createDevTenantValidator = vine.compile(
  vine.object({
    ownerEmail: email(),
    ownerPassword: password().confirmed({
      confirmationField: 'passwordConfirmation',
    }),
    seedMode: vine.enum(['empty', 'seeded'] as const),
    tenantName: vine.string().maxLength(120).trim(),
  })
)

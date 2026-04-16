import vine from '@vinejs/vine'

export const customerIndexValidator = vine.create({
  page: vine.number().min(1).optional(),
})

export const saveCustomerValidator = vine.create({
  address: vine.string().trim().minLength(1).maxLength(500),
  company: vine.string().trim().minLength(1).maxLength(255),
  email: vine.string().trim().email().maxLength(255).optional(),
  name: vine.string().trim().minLength(1).maxLength(255),
  note: vine.string().trim().maxLength(2000).optional(),
  phone: vine.string().trim().minLength(1).maxLength(64).optional(),
})

export const customerParamsValidator = vine.create({
  params: vine.object({
    id: vine.string().trim().minLength(1).maxLength(128),
  }),
})

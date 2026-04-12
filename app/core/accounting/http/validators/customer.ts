import vine from '@vinejs/vine'

export const customerIndexValidator = vine.create({
  page: vine.number().min(1).optional(),
})

export const saveCustomerValidator = vine.create({
  company: vine.string().trim().minLength(1).maxLength(255),
  email: vine.string().trim().email().maxLength(255),
  name: vine.string().trim().minLength(1).maxLength(255),
  note: vine.string().trim().maxLength(2000).optional(),
  phone: vine.string().trim().minLength(1).maxLength(64),
})

export const customerParamsValidator = vine.create({
  params: vine.object({
    id: vine.string().trim().minLength(1).maxLength(128),
  }),
})

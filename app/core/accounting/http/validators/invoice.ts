import vine from '@vinejs/vine'

const dateValidatorRegex = vine
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)

const invoiceLineValidator = vine.object({
  description: vine.string().trim().minLength(1).maxLength(500),
  quantity: vine.number().positive(),
  unitPrice: vine.number().min(0),
  vatRate: vine.number().min(0).max(100),
})

export const saveInvoiceDraftValidator = vine.create({
  customerId: vine.string().trim().minLength(1).maxLength(128),
  dueDate: dateValidatorRegex.clone(),
  issueDate: dateValidatorRegex.clone(),
  lines: vine.array(invoiceLineValidator).minLength(1),
})

export const invoiceParamsValidator = vine.create({
  params: vine.object({
    id: vine.string().trim().minLength(1).maxLength(128),
  }),
})

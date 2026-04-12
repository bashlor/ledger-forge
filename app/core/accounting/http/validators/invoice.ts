import vine from '@vinejs/vine'

const invoiceLineValidator = vine.object({
  description: vine.string().trim().minLength(1).maxLength(500),
  quantity: vine.number().positive(),
  unitPrice: vine.number().min(0),
  vatRate: vine.number().min(0).max(100),
})

export const saveInvoiceDraftValidator = vine.create({
  customerId: vine.string().trim().minLength(1).maxLength(128),
  dueDate: vine.string().trim().minLength(10).maxLength(10),
  issueDate: vine.string().trim().minLength(10).maxLength(10),
  lines: vine.array(invoiceLineValidator).minLength(1),
})

export const invoiceParamsValidator = vine.create({
  params: vine.object({
    id: vine.string().trim().minLength(1).maxLength(128),
  }),
})

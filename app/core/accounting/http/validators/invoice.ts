import vine from '@vinejs/vine'

import { vineDateString } from './shared.js'

const invoiceLineValidator = vine.object({
  description: vine.string().trim().minLength(1).maxLength(500),
  quantity: vine.number().positive(),
  unitPrice: vine.number().min(0),
  vatRate: vine.number().min(0).max(100),
})

export const saveInvoiceDraftValidator = vine.create({
  customerId: vine.string().trim().minLength(1).maxLength(128),
  dueDate: vineDateString.clone(),
  issueDate: vineDateString.clone(),
  lines: vine.array(invoiceLineValidator).minLength(1),
})

export const invoiceParamsValidator = vine.create({
  params: vine.object({
    id: vine.string().trim().minLength(1).maxLength(128),
  }),
})

export const issueInvoiceValidator = vine.create({
  issuedCompanyAddress: vine.string().trim().minLength(1).maxLength(4000),
  issuedCompanyName: vine.string().trim().minLength(1).maxLength(255),
})

export const invoiceIndexValidator = vine.create({
  customer: vine.string().trim().minLength(1).maxLength(128).optional(),
  endDate: vineDateString
    .clone()
    .optional()
    .requiredWhen((field) => !!field.data.startDate),
  invoice: vine.string().trim().minLength(1).maxLength(128).optional(),
  page: vine.number().min(1).optional(),
  startDate: vineDateString
    .clone()
    .optional()
    .requiredWhen((field) => !!field.data.endDate),
})

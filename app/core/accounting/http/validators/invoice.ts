import { isAllowedInvoiceVatRate } from '#core/accounting/application/invoices/domain/invoice_vat'
import vine from '@vinejs/vine'

import {
  dateRangeRule,
  hasFieldValue,
  vineDateString,
  type VineFieldContextLike,
} from './shared.js'

const invoiceLineValidator = vine.object({
  description: vine.string().trim().minLength(1).maxLength(500),
  quantity: vine.number().positive(),
  unitPrice: vine.number().min(0),
  vatRate: vine.number().transform((value, field) => {
    if (!isAllowedInvoiceVatRate(value)) {
      field.report('Invoice line VAT rate must be one of 0, 5.5, 10, or 20.', 'vat_rate', field)
    }
    return value
  }),
})

export const previewInvoiceDraftValidator = vine.create({
  lines: vine.array(invoiceLineValidator).minLength(1),
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

export const invoiceIndexValidator = vine.create(
  vine
    .object({
      customer: vine.string().trim().minLength(1).maxLength(128).optional(),
      endDate: vineDateString
        .clone()
        .optional()
        .requiredWhen((field: VineFieldContextLike) => hasFieldValue(field, 'startDate')),
      invoice: vine.string().trim().minLength(1).maxLength(128).optional(),
      page: vine.number().min(1).optional(),
      perPage: vine.number().min(1).max(100).optional(),
      search: vine.string().trim().maxLength(255).optional(),
      startDate: vineDateString
        .clone()
        .optional()
        .requiredWhen((field: VineFieldContextLike) => hasFieldValue(field, 'endDate')),
    })
    .use(dateRangeRule())
)

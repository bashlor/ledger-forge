import { fromCents } from '#core/shared/money'

import type { ExpenseDto, ExpenseRow } from './types.js'

export function toExpenseDto(row: ExpenseRow): ExpenseDto {
  return {
    amount: fromCents(row.amountCents),
    canConfirm: row.status === 'draft',
    canDelete: row.status === 'draft',
    canEdit: row.status === 'draft',
    category: row.category,
    date: row.date,
    id: row.id,
    label: row.label,
    status: row.status,
  }
}

import vine from '@vinejs/vine'

export interface VineFieldContextLike {
  data: unknown
  report(message: string, rule: string, field: unknown): void
}

/**
 * Vine schema for validated ISO-8601 calendar dates (YYYY-MM-DD).
 *
 * Two layers of validation:
 *  1. Regex ensures the format is strictly YYYY-MM-DD.
 *  2. Transform rejects non-existent calendar dates (e.g. 2026-02-30)
 *     that would otherwise pass the regex and be inserted silently.
 */
export const vineDateString = vine
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((value, field) => {
    const [year, month, day] = value.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
      field.report('Invalid calendar date.', 'invalid_date', field)
    }
    return value
  })

export const dateRangeRule = vine.createRule((value, _options, field) => {
  const record = value as { endDate?: string; startDate?: string }

  if (
    typeof record?.startDate === 'string' &&
    typeof record?.endDate === 'string' &&
    record.endDate < record.startDate
  ) {
    field.report('End date must be on or after start date.', 'date_range', field)
  }
})

export function hasFieldValue(field: VineFieldContextLike, key: string): boolean {
  const record = field.data as Record<string, unknown>
  return typeof record[key] === 'string' && record[key].length > 0
}

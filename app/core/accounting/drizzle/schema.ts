import { pgSchema } from 'drizzle-orm/pg-core'

export const mainSchema = pgSchema('main')

/**
 * Add tables for the main bounded context here.
 *
 * Example:
 * export const jobs = mainSchema.table('jobs', { ... })
 */

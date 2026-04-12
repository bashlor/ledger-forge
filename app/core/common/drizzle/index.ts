/**
 * Barrel export aggregating all Drizzle schemas from bounded contexts.
 * Import this module wherever you need the combined schema (provider, config, etc.).
 */

export * from '#core/accounting/drizzle/schema'
export * from '#core/user_management/drizzle/schema'

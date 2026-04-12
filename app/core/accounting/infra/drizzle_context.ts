import type * as schema from '#core/common/drizzle/index'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

export type AccountingDb = PostgresJsDatabase<typeof schema>

export type AccountingTx = Parameters<Parameters<AccountingDb['transaction']>[0]>[0]

export type DbOrTx = AccountingDb | AccountingTx

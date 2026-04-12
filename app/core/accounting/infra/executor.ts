import type { AccountingDb, DbOrTx } from './drizzle_context.js'

export class Executor {
  constructor(private readonly db: AccountingDb) {}

  async run<T>(work: (db: DbOrTx) => Promise<T>): Promise<T> {
    return work(this.db)
  }

  async transaction<T>(work: (tx: DbOrTx) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => work(tx))
  }
}

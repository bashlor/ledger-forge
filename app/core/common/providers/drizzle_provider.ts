import type { ApplicationService } from '@adonisjs/core/types'

import env from '#start/env'
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { DrizzleLogger } from '../drizzle/drizzle_logger.js'
import * as schema from '../drizzle/index.js'

let postgresClient: null | ReturnType<typeof postgres> = null

/**
 * Closes the shared postgres.js client. One-shot Ace commands (e.g. migration:run) must
 * call this when finished, or open sockets keep the Node event loop alive and the process
 * never exits — which blocks Docker Compose `service_completed_successfully` for the app.
 */
export async function endDrizzlePostgresClient(): Promise<void> {
  if (postgresClient) {
    await postgresClient.end()
    postgresClient = null
  }
}

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    drizzle: PostgresJsDatabase<typeof schema>
  }
}

export default class DrizzleProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton('drizzle', () => {
      postgresClient = postgres({
        database: env.get('DB_DATABASE'),
        host: env.get('DB_HOST'),
        password: env.get('DB_PASSWORD'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
      })
      return drizzlePostgres(postgresClient, { logger: new DrizzleLogger(), schema })
    })
  }

  async shutdown() {
    await endDrizzlePostgresClient()
  }
}

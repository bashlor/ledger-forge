import * as schema from '#core/common/drizzle/index'
import { AuthenticationPort } from '#core/user_management/domain/authentication'
import { BetterAuthAdapter } from '#core/user_management/infra/auth/better_auth_adapter'
import { createBetterAuth } from '#core/user_management/infra/auth/better_auth_drizzle'
import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { sql as drizzleSql } from 'drizzle-orm'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

import { prepareTestcontainersRuntime } from './testcontainers_runtime.js'

const TEST_CONTAINER_DATABASE = 'accounting_integration_test'
const TEST_CONTAINER_PASSWORD = 'accounting_test_password'
const TEST_CONTAINER_USERNAME = 'accounting_test_user'

export interface TestPostgresContext {
  authAdapter: BetterAuthAdapter
  betterAuth: Awaited<ReturnType<typeof createBetterAuth>>
  cleanup: () => Promise<void>
  connectionString: string
  container: StartedPostgreSqlContainer
  db: PostgresJsDatabase<typeof schema>
  reset: () => Promise<void>
  sql: ReturnType<typeof postgres>
}

export function bindTestServices(context: TestPostgresContext): void {
  app.container.bindValue('drizzle', context.db)
  app.container.bindValue('betterAuth', context.betterAuth)
  app.container.bindValue('authAdapter', context.authAdapter)
  app.container.bindValue(AuthenticationPort, context.authAdapter)
}

export async function createTestPostgresContext(): Promise<TestPostgresContext> {
  prepareTestcontainersRuntime()

  const postgresImage = env.get('POSTGRES_TEST_IMAGE')
  if (!postgresImage) {
    throw new Error('Missing POSTGRES_TEST_IMAGE in test environment configuration.')
  }

  let container: StartedPostgreSqlContainer
  try {
    container = await new PostgreSqlContainer(postgresImage)
      .withDatabase(TEST_CONTAINER_DATABASE)
      .withUsername(TEST_CONTAINER_USERNAME)
      .withPassword(TEST_CONTAINER_PASSWORD)
      .start()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Could not start PostgreSQL testcontainer (image: ${postgresImage}).\n` +
        `Make sure a supported container runtime (Docker/Podman) is reachable and POSTGRES_TEST_IMAGE is configured in your test environment.\n` +
        `For Podman rootless, expose the Podman socket and set DOCKER_HOST / TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE when needed.\n` +
        `Original error: ${message}`
    )
  }

  const connectionString = container.getConnectionUri()
  const sql = postgres(connectionString)
  const db = drizzle(sql, { schema })

  await migrate(db, {
    migrationsFolder: fileURLToPath(new URL('../../drizzle/migrations', import.meta.url)),
  })

  const betterAuth = await createBetterAuth(db, {
    emailAndPassword: {
      enabled: true,
      maxPasswordLength: 128,
      minPasswordLength: 8,
      sendResetPassword: async () => {},
    },
    session: {
      cookieCache: { enabled: false },
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 0,
    },
  })
  const authAdapter = new BetterAuthAdapter(betterAuth, db)

  return {
    authAdapter,
    betterAuth,
    cleanup: async () => {
      await sql.end()
      await container.stop()
    },
    connectionString,
    container,
    db,
    reset: async () => {
      await db.execute(
        drizzleSql.raw(
          'TRUNCATE auth.session, auth.invitation, auth.member, auth.organization, auth.account, auth.verification, auth.user RESTART IDENTITY CASCADE'
        )
      )
    },
    sql,
  }
}

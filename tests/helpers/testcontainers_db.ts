import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

import * as schema from '../../app/core/common/drizzle/index.js'
import { prepareTestcontainersRuntime } from './testcontainers_runtime.js'

/**
 * Stable organization id used across all integration and route tests.
 * Must be seeded in the DB before any tenant-scoped insert.
 */
export const TEST_TENANT_ID = 'test_org_id'

/**
 * Insert the shared test organization into `auth.organization`.
 * Call this once per test group in `group.setup` after the DB is ready.
 */
export async function seedTestOrganization(db: PostgresJsDatabase<any>): Promise<void> {
  await db.insert(schema.organization).values({
    id: TEST_TENANT_ID,
    name: 'Test Organization',
    slug: 'test-org',
  })
}

const migrationsFolder = fileURLToPath(new URL('../../drizzle/migrations', import.meta.url))
const TEST_CONTAINER_DATABASE = 'accounting_routes_test'
const TEST_CONTAINER_PASSWORD = 'accounting_test_password'
const TEST_CONTAINER_USERNAME = 'accounting_test_user'

/**
 * Start a PostgreSQL testcontainer, run all Drizzle migrations, and bind
 * the resulting `drizzle` instance into the AdonisJS IoC container.
 */
export async function setupTestDatabaseForGroup(): Promise<{
  cleanup: () => Promise<void>
  container: StartedPostgreSqlContainer
}> {
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
        `Make sure a supported container runtime (Docker/Podman) is reachable and POSTGRES_TEST_IMAGE is configured in your test env.\n` +
        `For Podman rootless, expose the Podman socket and set DOCKER_HOST / TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE when needed.\n` +
        `Original error: ${message}`
    )
  }

  const pgClient = postgres({
    database: container.getDatabase(),
    host: container.getHost(),
    password: container.getPassword(),
    port: container.getPort(),
    ssl: false,
    user: container.getUsername(),
  })

  const db = drizzlePostgres(pgClient, { schema })

  await migrate(db, { migrationsFolder })

  app.container.bindValue('drizzle', db)

  return {
    cleanup: async () => {
      await pgClient.end()
      await container.stop()
    },
    container,
  }
}

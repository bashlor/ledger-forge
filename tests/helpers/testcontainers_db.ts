import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

import * as schema from '../../app/core/common/drizzle/index.js'

const migrationsFolder = fileURLToPath(new URL('../../drizzle/migrations', import.meta.url))

/**
 * Start a PostgreSQL testcontainer, run all Drizzle migrations, and bind
 * the resulting `drizzle` instance into the AdonisJS IoC container.
 *
 * Requires Docker to be running. Configure the image with POSTGRES_TEST_IMAGE.
 *
 * Returns a cleanup function that stops the container and closes the
 * connection. Call it in `group.teardown()`.
 */
export async function setupTestDatabaseForGroup(): Promise<{
  cleanup: () => Promise<void>
  container: StartedPostgreSqlContainer
}> {
  const postgresImage = env.get('POSTGRES_TEST_IMAGE')

  if (!postgresImage) {
    throw new Error('Missing POSTGRES_TEST_IMAGE in test environment configuration.')
  }

  let container: StartedPostgreSqlContainer
  try {
    container = await new PostgreSqlContainer(postgresImage)
      .withDatabase('testdb')
      .withUsername('testuser')
      .withPassword('testpassword')
      .start()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Could not start PostgreSQL testcontainer (image: ${postgresImage}).\n` +
        `Make sure Docker is running and POSTGRES_TEST_IMAGE is configured in your test env.\n` +
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

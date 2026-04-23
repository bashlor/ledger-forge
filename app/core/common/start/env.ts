/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../../../../', import.meta.url), {
  // App
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),
  // Better Auth
  BETTER_AUTH_SECRET: Env.schema.string(),
  DB_DATABASE: Env.schema.string(),
  // Database (PostgreSQL)
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PASSWORD: Env.schema.string(),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DEMO_ALLOWED_TENANT_IDS: Env.schema.string.optional(),
  DEMO_COMMANDS_ENABLED: Env.schema.boolean.optional(),
  DEMO_MODE_ENABLED: Env.schema.boolean.optional(),
  DEV_OPERATOR_DEFAULT_EMAIL: Env.schema.string.optional(),
  DEV_OPERATOR_DEFAULT_NAME: Env.schema.string.optional(),
  DEV_OPERATOR_DEFAULT_PASSWORD: Env.schema.string.optional(),
  DEV_TOOLS_DESTRUCTIVE_OPERATIONS_ENABLED: Env.schema.boolean.optional(),
  DEV_TOOLS_ENABLED: Env.schema.boolean.optional(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),

  PORT: Env.schema.number(),
  POSTGRES_TEST_IMAGE: Env.schema.string.optional(),
  REQUIRE_EMAIL_VERIFICATION: Env.schema.boolean(),
  // Session (AdonisJS — for flash messages, CSRF, transient HTTP data only)
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory'] as const),
  // Tenant mode
  SINGLE_TENANT_ORG_ID: Env.schema.string.optional(),
  TENANT_MODE: Env.schema.string.optional(),
  TZ: Env.schema.string.optional(),
})

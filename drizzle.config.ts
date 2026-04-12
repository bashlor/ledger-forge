import { defineConfig } from 'drizzle-kit'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const drizzleConfigDir = dirname(fileURLToPath(import.meta.url))

export const drizzleMigrationsOut = './drizzle/migrations'

export function getDrizzleDbCredentials() {
  return {
    database: process.env.DB_DATABASE || 'accounting-dev',
    host: process.env.DB_HOST || 'localhost',
    password: process.env.DB_PASSWORD || 'accounting',
    port: Number(process.env.DB_PORT) || 5432,
    ssl: false,
    user: process.env.DB_USER || 'accounting',
  }
}

/**
 * Absolute migrations folder (matches `out` above).
 * Under @poppinss/ts-exec, `import.meta.url` for this file may point at a temp copy;
 * fall back to `process.cwd()/drizzle/migrations` when the journal exists there.
 */
export function resolveDrizzleMigrationsFolder(): string {
  const fromConfigDir = join(drizzleConfigDir, 'drizzle', 'migrations')
  const fromCwd = join(process.cwd(), 'drizzle', 'migrations')
  const fromAppsWeb = join(process.cwd(), 'apps', 'web', 'drizzle', 'migrations')

  if (existsSync(journalFilePath(fromConfigDir))) {
    return fromConfigDir
  }
  if (existsSync(journalFilePath(fromCwd))) {
    return fromCwd
  }
  if (existsSync(journalFilePath(fromAppsWeb))) {
    return fromAppsWeb
  }

  if (process.env.DEBUG_DRIZZLE_MIGRATIONS === '1') {
    console.error('[resolveDrizzleMigrationsFolder]', {
      cwd: process.cwd(),
      drizzleConfigDir,
      fromAppsWeb,
      fromConfigDir,
      fromCwd,
    })
  }

  return fromConfigDir
}

function journalFilePath(migrationsDir: string): string {
  return join(migrationsDir, 'meta', '_journal.json')
}

export default defineConfig({
  dbCredentials: getDrizzleDbCredentials(),
  dialect: 'postgresql',
  out: drizzleMigrationsOut,
  schema: ['./app/core/*/drizzle/schema.ts'],
})

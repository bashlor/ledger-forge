import type { ApplicationService } from '@adonisjs/core/types'

import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { drizzleMigrationsOut } from '../../../../drizzle.config.js'

export interface DrizzleDbMigrationRow {
  createdAt: number
  hash: string
  id: number
}

export interface DrizzleMigrationEntry {
  breakpoints: boolean
  hash: string
  tag: string
  when: number
}

interface JournalFile {
  entries: Array<{
    breakpoints: boolean
    tag: string
    when: number
  }>
}

export function getDrizzleConfigPath(app: ApplicationService) {
  return app.makePath('drizzle.config.ts')
}

export function getDrizzleMigrationsPath(app: ApplicationService) {
  return app.makePath(drizzleMigrationsOut)
}

export function readLocalMigrations(app: ApplicationService): DrizzleMigrationEntry[] {
  const migrationsPath = getDrizzleMigrationsPath(app)
  const journalPath = join(migrationsPath, 'meta/_journal.json')

  if (!existsSync(journalPath)) {
    throw new Error(
      `Drizzle journal not found: ${journalPath} is required to read migration state.`
    )
  }

  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as JournalFile

  return journal.entries.map((entry) => {
    const migrationPath = join(migrationsPath, `${entry.tag}.sql`)

    if (!existsSync(migrationPath)) {
      throw new Error(`Missing migration file: ${migrationPath}`)
    }

    const sqlContent = readFileSync(migrationPath, 'utf8')

    return {
      breakpoints: entry.breakpoints,
      hash: createHash('sha256').update(sqlContent).digest('hex'),
      tag: entry.tag,
      when: entry.when,
    }
  })
}

export async function runDrizzleKit(
  app: ApplicationService,
  drizzleCommand: string,
  drizzleFlags: string[]
) {
  const configPath = getDrizzleConfigPath(app)

  if (!existsSync(configPath)) {
    throw new Error(`Drizzle config not found: ${configPath}`)
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      'pnpm',
      ['exec', 'drizzle-kit', drizzleCommand, '--config', configPath, ...drizzleFlags],
      {
        cwd: app.makePath(),
        env: process.env,
        stdio: 'inherit',
      }
    )

    child.once('error', reject)
    child.once('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`drizzle-kit ${drizzleCommand} exited with code ${code ?? 'unknown'}.`))
    })
  })
}

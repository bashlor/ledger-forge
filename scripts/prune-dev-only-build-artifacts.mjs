import { existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const targets = [
  'build/commands/reset_demo.js',
  'build/commands/reset_demo.js.map',
  'build/commands/seed_demo.js',
  'build/commands/seed_demo.js.map',
]

for (const target of targets) {
  const absolutePath = resolve(repoRoot, target)
  if (existsSync(absolutePath)) {
    rmSync(absolutePath, { force: true })
  }
}

import { existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const includeDevTools = process.env.BUILD_INCLUDE_DEV_TOOLS === 'true'
const targets = [
  'build/commands/reset_demo.js',
  'build/commands/reset_demo.js.map',
  'build/commands/seed_demo.js',
  'build/commands/seed_demo.js.map',
]

if (!includeDevTools) {
  targets.push(
    'build/app/core/dev_tools',
    'build/inertia/pages/dev',
    'build/public/assets/dev',
    'build/public/assets/pages/dev'
  )
}

for (const target of targets) {
  const absolutePath = resolve(repoRoot, target)
  if (existsSync(absolutePath)) {
    rmSync(absolutePath, { force: true, recursive: true })
  }
}

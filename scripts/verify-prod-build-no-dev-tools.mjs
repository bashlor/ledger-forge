import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const buildRoot = resolve(repoRoot, process.argv[2] ?? 'build')

const forbiddenPaths = [
  'app/core/dev_tools',
  'inertia/pages/dev',
  'public/assets/dev',
  'public/assets/pages/dev',
  'commands/reset_demo.js',
  'commands/seed_demo.js',
]
const forbiddenAssetPathTerms = ['dev/inspector', 'dev/access', 'dev_tools', 'inspector']

if (!existsSync(buildRoot)) {
  fail(`Build directory not found: ${buildRoot}`)
}

for (const forbiddenPath of forbiddenPaths) {
  const absolutePath = resolve(buildRoot, forbiddenPath)
  if (existsSync(absolutePath)) {
    fail(`Forbidden dev-tools build artifact found: ${forbiddenPath}`)
  }
}

const publicAssetsPath = resolve(buildRoot, 'public/assets')
if (existsSync(publicAssetsPath)) {
  for (const filePath of walk(publicAssetsPath)) {
    const relativePath = relative(buildRoot, filePath)
    const matchedTerm = forbiddenAssetPathTerms.find((term) => relativePath.includes(term))
    if (matchedTerm) {
      fail(`Forbidden dev-tools frontend artifact marker "${matchedTerm}" found in ${relativePath}`)
    }
  }
}

console.log(`Production build has no dev-tools artifacts under ${relative(repoRoot, buildRoot)}`)

function fail(message) {
  console.error(message)
  process.exit(1)
}

function* walk(directory) {
  for (const entry of readdirSync(directory)) {
    const absolutePath = join(directory, entry)
    const stats = statSync(absolutePath)
    if (stats.isDirectory()) {
      yield* walk(absolutePath)
    } else if (stats.isFile()) {
      yield absolutePath
    }
  }
}

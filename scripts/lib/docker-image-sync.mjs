import { execFileSync } from 'node:child_process'
import { accessSync, constants, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = join(__dirname, '../..')
export const LOCK_PATH = join(REPO_ROOT, 'docker', 'images.lock.yaml')

const SAFE_EXECUTABLE_DIRS = [
  '/usr/local/sbin',
  '/usr/local/bin',
  '/usr/sbin',
  '/usr/bin',
  '/sbin',
  '/bin',
]

const SAFE_EXECUTABLE_PATH = SAFE_EXECUTABLE_DIRS.join(':')

const SAFE_EXEC_ENV = {
  ...process.env,
  PATH: SAFE_EXECUTABLE_PATH,
}

export const POSTGRES_DEFAULT_PATTERN =
  /\$\{POSTGRES_TEST_IMAGE:-[^}]+\}/g

export function loadLock() {
  const content = readFileSync(LOCK_PATH, 'utf8')
  const images = {}
  let current = null

  for (const line of content.split(/\r?\n/)) {
    const keyMatch = line.match(/^ {2}(\w+):$/)
    if (keyMatch) {
      current = keyMatch[1]
      continue
    }

    const refMatch = line.match(/^ {4}ref: (.+)$/)
    if (refMatch && current) {
      images[current] = refMatch[1].trim()
      current = null
    }
  }

  const required = ['postgres', 'redis', 'node', 'chainguard_node', 'maintenant']
  for (const key of required) {
    if (!images[key]) {
      throw new Error(`Missing image ref for "${key}" in ${LOCK_PATH}`)
    }
  }

  return images
}

export function nodeFromRef(nodeRef) {
  return nodeRef.replace(/^docker\.io\/library\//, '')
}

export function readText(relativePath) {
  return readFileSync(resolveRepoPath(relativePath), 'utf8')
}

export function refreshLock(images) {
  const next = { ...images }

  for (const [key, ref] of Object.entries(images)) {
    const tag = ref.split('@sha256:')[0]
    const digest = inspectDigest(tag)
    next[key] = `${tag}@${digest}`
    console.log(`${key}: ${digest}`)
  }

  writeLock(next)
  return next
}

export function replaceComposeServiceImage(content, service, ref) {
  const pattern = new RegExp(String.raw`(^  ${service}:\n    image: ).*$`, 'm')
  if (!pattern.test(content)) {
    throw new Error(`Could not find services.${service}.image`)
  }
  return content.replace(pattern, `$1${ref}`)
}

export function replaceDockerfileBuildDefault(content, ref) {
  return content.replace(
    /POSTGRES_TEST_IMAGE="\$\{BUILD_POSTGRES_TEST_IMAGE:-[^"]+\}"/g,
    `POSTGRES_TEST_IMAGE="\${BUILD_POSTGRES_TEST_IMAGE:-${ref}}"`
  )
}

export function replaceDockerfileEnvDefault(content, ref) {
  return content.replace(
    /POSTGRES_TEST_IMAGE=\$\{BUILD_POSTGRES_TEST_IMAGE:-[^}]+\}/g,
    `POSTGRES_TEST_IMAGE=\${BUILD_POSTGRES_TEST_IMAGE:-${ref}}`
  )
}

export function replaceDockerfileFrom(content, stageName, ref) {
  const pattern = new RegExp(`(^FROM .+ AS ${stageName}$)`, 'm')
  if (!content.match(pattern)) {
    throw new Error(`Could not find Dockerfile stage "${stageName}"`)
  }
  return content.replace(pattern, `FROM ${ref} AS ${stageName}`)
}

export function replaceEnvTestExample(content, ref) {
  if (!content.match(/^POSTGRES_TEST_IMAGE=.*$/m)) {
    throw new Error('Could not find POSTGRES_TEST_IMAGE in .env.test.example')
  }
  return content.replace(/^POSTGRES_TEST_IMAGE=.*$/m, `POSTGRES_TEST_IMAGE=${ref}`)
}

export function replacePostgresTestImageDefault(content, ref) {
  return content.replace(POSTGRES_DEFAULT_PATTERN, `\${POSTGRES_TEST_IMAGE:-${ref}}`)
}

export function resolveRepoPath(relativePath) {
  const absolutePath = resolve(REPO_ROOT, relativePath)
  const pathWithinRepo = relative(REPO_ROOT, absolutePath)

  if (pathWithinRepo.startsWith('..') || pathWithinRepo.includes('..')) {
    throw new Error(`Path escapes repo root: ${relativePath}`)
  }

  return absolutePath
}

export function syncTargets(images, targets, { dryRun = false } = {}) {
  return targets.map((target) => {
    const current = readText(target.path)
    const expected = target.apply(images, current)
    const changed = current !== expected

    if (!dryRun && changed) {
      writeText(target.path, expected)
    }

    return { changed, path: target.path }
  })
}

export function verifyTargets(targets, { commandHint }) {
  const images = loadLock()
  const changed = syncTargets(images, targets, { dryRun: true }).filter((result) => result.changed)

  if (changed.length > 0) {
    console.error('Docker image refs are out of sync with docker/images.lock.yaml:')
    for (const result of changed) {
      console.error(`  - ${result.path}`)
    }
    console.error(`Run: ${commandHint}`)
    process.exit(1)
  }

  console.log('docker image refs are in sync')
}

export function writeLock(images) {
  const lines = [
    '# Single source of truth for pinned container images (tag@sha256).',
    '# Update via: ./scripts/sync-docker-images.sh refresh',
    '# Propagate via: ./scripts/sync-docker-images.sh sync',
    '# Do not edit @sha256 digests in compose/Dockerfiles by hand.',
    'images:',
    '  postgres:',
    `    ref: ${images.postgres}`,
    '  redis:',
    `    ref: ${images.redis}`,
    '  node:',
    `    ref: ${images.node}`,
    '  # Tag "latest" is documentary; the digest is authoritative.',
    '  chainguard_node:',
    `    ref: ${images.chainguard_node}`,
    '  maintenant:',
    `    ref: ${images.maintenant}`,
    '',
  ]
  writeFileSync(LOCK_PATH, lines.join('\n'))
}

export function writeText(relativePath, content) {
  writeFileSync(resolveRepoPath(relativePath), content)
}

function execTool(executable, args) {
  return execFileSync(executable, args, {
    encoding: 'utf8',
    env: SAFE_EXEC_ENV,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function inspectDigest(tagRef) {
  const tag = tagRef.split('@sha256:')[0]

  const docker = resolveExecutable('docker')
  if (docker) {
    try {
      const digest = execTool(docker, [
        'buildx',
        'imagetools',
        'inspect',
        tag,
        '--format',
        '{{index .Manifest.Digest}}',
      ])
      if (digest) {
        return digest
      }
    } catch {
      // fall through to skopeo
    }
  }

  const skopeo = resolveExecutable('skopeo')
  if (skopeo) {
    const digest = execTool(skopeo, ['inspect', '--format', '{{.Digest}}', `docker://${tag}`])
    if (digest) {
      return digest
    }
  }

  throw new Error(
    `Could not resolve digest for ${tag}. Install docker buildx or skopeo with registry access.`
  )
}

function resolveExecutable(name) {
  for (const directory of SAFE_EXECUTABLE_DIRS) {
    const executable = join(directory, name)
    try {
      accessSync(executable, constants.X_OK)
      return executable
    } catch {
      continue
    }
  }

  return null
}

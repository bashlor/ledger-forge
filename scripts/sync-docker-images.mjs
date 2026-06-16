#!/usr/bin/env node
/**
 * Sync pinned container image refs from docker/images.lock.yaml into public repo paths.
 * Commands: sync | verify | refresh
 */
import {
  loadLock,
  nodeFromRef,
  refreshLock,
  replaceComposeServiceImage,
  replaceDockerfileBuildDefault,
  replaceDockerfileFrom,
  replaceEnvTestExample,
  replacePostgresTestImageDefault,
  syncTargets,
  verifyTargets,
} from './lib/docker-image-sync.mjs'

const TARGETS = [
  {
    apply(images, content) {
      let next = content
      next = replaceComposeServiceImage(next, 'postgres', images.postgres)
      next = replaceComposeServiceImage(next, 'redis', images.redis)
      next = replaceComposeServiceImage(next, 'maintenant', images.maintenant)
      return next
    },
    path: 'docker-compose.yml',
  },
  {
    apply(images, content) {
      let next = content
      next = replaceComposeServiceImage(next, 'postgres', images.postgres)
      next = replaceComposeServiceImage(next, 'redis', images.redis)
      next = replacePostgresTestImageDefault(next, images.postgres)
      return next
    },
    path: 'docker-compose.test.yml',
  },
  {
    apply(images, content) {
      let next = content
      next = replaceDockerfileFrom(next, 'base', nodeFromRef(images.node))
      next = replaceDockerfileFrom(next, 'production', images.chainguard_node)
      next = replaceDockerfileBuildDefault(next, images.postgres)
      return next
    },
    path: 'Dockerfile',
  },
  {
    apply(images, content) {
      return replaceComposeServiceImage(content, 'maintenant', images.maintenant)
    },
    path: 'test_scripts/docker-compose.prod-local.override.yml',
  },
  {
    apply(images, content) {
      return replaceEnvTestExample(content, images.postgres)
    },
    path: '.env.test.example',
  },
]

function runSync({ dryRun = false } = {}) {
  const images = loadLock()
  const results = syncTargets(images, TARGETS, { dryRun })
  const changed = results.filter((result) => result.changed)

  if (!dryRun) {
    for (const result of changed) {
      console.log(`updated ${result.path}`)
    }

    if (changed.length === 0) {
      console.log('all image refs already in sync')
    }
  }

  return changed
}

const command = process.argv[2] ?? 'sync'

switch (command) {
  case 'refresh': {
    refreshLock(loadLock())
    runSync()
    console.log('refreshed lock file and synced consumers')
    break
  }
  case 'sync': {
    runSync()
    break
  }
  case 'verify': {
    verifyTargets(TARGETS, { commandHint: './scripts/sync-docker-images.sh sync' })
    break
  }
  default: {
    console.error(`Unknown command: ${command}`)
    console.error('Usage: sync-docker-images.mjs <sync|verify|refresh>')
    process.exit(1)
  }
}

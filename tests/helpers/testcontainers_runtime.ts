import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

export function prepareTestcontainersRuntime(): void {
  if (process.env.DOCKER_HOST) {
    return
  }

  if (commandExists('docker') && commandSucceeds('docker', ['info'])) {
    return
  }

  if (!commandExists('podman')) {
    return
  }

  const socketPath = podmanSocketPath()
  if (!socketPath) {
    return
  }

  if (existsSync(socketPath)) {
    configurePodmanSocket(socketPath)
    return
  }

  if (commandExists('systemctl')) {
    spawnSync('systemctl', ['--user', 'start', 'podman.socket'], { stdio: 'ignore' })
  }

  if (existsSync(socketPath)) {
    configurePodmanSocket(socketPath)
  }
}

function commandExists(command: string): boolean {
  const result = spawnSync('bash', ['-lc', `command -v ${command}`], { stdio: 'ignore' })
  return !result.error && result.status === 0
}

function commandSucceeds(command: string, args: string[]): boolean {
  const result = spawnSync(command, args, { stdio: 'ignore' })
  return !result.error && result.status === 0
}

function configurePodmanSocket(socketPath: string): void {
  process.env.DOCKER_HOST = `unix://${socketPath}`
  process.env.TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE = socketPath
  process.env.TESTCONTAINERS_RYUK_DISABLED ??= 'true'
}

function podmanSocketPath(): null | string {
  if (typeof process.getuid !== 'function') {
    return null
  }

  return `${process.env.XDG_RUNTIME_DIR ?? `/run/user/${process.getuid()}`}/podman/podman.sock`
}

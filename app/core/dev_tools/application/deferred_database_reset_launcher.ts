import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

export interface DeferredDatabaseResetCommandRunner {
  run(command: string, args: string[], options: DeferredDatabaseResetLaunchOptions): void
}

interface DeferredDatabaseResetLaunchOptions {
  cwd: string
  env: NodeJS.ProcessEnv
}

class NodeDeferredDatabaseResetCommandRunner implements DeferredDatabaseResetCommandRunner {
  run(command: string, args: string[], options: DeferredDatabaseResetLaunchOptions): void {
    const child = spawn(command, args, {
      cwd: options.cwd,
      detached: true,
      env: options.env,
      stdio: 'ignore',
    })

    child.unref()
  }
}

export class DeferredDatabaseResetLauncher {
  constructor(
    private readonly runner: DeferredDatabaseResetCommandRunner = new NodeDeferredDatabaseResetCommandRunner(),
    private readonly repoRoot: string = resolve(import.meta.dirname, '../../../../'),
    private readonly scriptPath: string = resolve(
      import.meta.dirname,
      '../../../../scripts/reset-local-dev-environment.sh'
    ),
    private readonly delaySeconds: number = 3
  ) {}

  schedule(sourcePid: number): void {
    this.runner.run('bash', [this.scriptPath], {
      cwd: this.repoRoot,
      env: {
        ...process.env,
        DATABASE_RESET_DELAY_SECONDS: String(this.delaySeconds),
        RESET_SOURCE_PID: String(sourcePid),
      },
    })
  }
}

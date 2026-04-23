import { test } from '@japa/runner'

import {
  type DeferredDatabaseResetCommandRunner,
  DeferredDatabaseResetLauncher,
} from './deferred_database_reset_launcher.js'

test.group('DeferredDatabaseResetLauncher', () => {
  test('schedules the local reset shell script with delay and source pid', ({ assert }) => {
    const calls: Array<{
      args: string[]
      command: string
      options: { cwd: string; env: NodeJS.ProcessEnv }
    }> = []

    const runner: DeferredDatabaseResetCommandRunner = {
      run(command, args, options) {
        calls.push({ args, command, options })
      },
    }

    const launcher = new DeferredDatabaseResetLauncher(
      runner,
      '/repo',
      '/repo/scripts/reset-local-dev-environment.sh',
      7
    )

    launcher.schedule(4242)

    assert.lengthOf(calls, 1)
    assert.equal(calls[0]!.command, 'bash')
    assert.deepEqual(calls[0]!.args, ['/repo/scripts/reset-local-dev-environment.sh'])
    assert.equal(calls[0]!.options.cwd, '/repo')
    assert.equal(calls[0]!.options.env.DATABASE_RESET_DELAY_SECONDS, '7')
    assert.equal(calls[0]!.options.env.RESET_SOURCE_PID, '4242')
  })
})

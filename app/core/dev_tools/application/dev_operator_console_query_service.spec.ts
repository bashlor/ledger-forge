import { DevToolsEnvironmentService } from '#core/user_management/application/dev_tools_environment_service'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

import { DevOperatorConsoleQueryService } from './dev_operator_console_query_service.js'

test.group('DevOperatorConsoleQueryService', () => {
  test('rejects access when dev tools are disabled', async ({ assert }) => {
    try {
      app.container.swap(
        DevToolsEnvironmentService,
        async () => new DevToolsEnvironmentService(false)
      )
      const db = {
        select() {
          throw new Error('database should not be queried when dev tools are disabled')
        },
      }
      const service = new DevOperatorConsoleQueryService(db as never)

      await assert.rejects(() => service.listInspectableTenants({} as never), /Development tools/)
    } finally {
      app.container.restore(DevToolsEnvironmentService)
    }
  })
})

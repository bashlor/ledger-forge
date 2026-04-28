import { DevToolsEnvironmentService } from '#core/user_management/application/dev_tools_environment_service'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

import { DevOperatorConsoleScenarioService } from './dev_operator_console_scenario_service.js'

test.group('DevOperatorConsoleScenarioService', () => {
  test('rejects scenario resolution when dev tools are disabled', async ({ assert }) => {
    try {
      app.container.swap(
        DevToolsEnvironmentService,
        async () => new DevToolsEnvironmentService(false)
      )
      const queryService = {
        listInspectableTenants() {
          throw new Error('query service should not be used when dev tools are disabled')
        },
      }
      const service = new DevOperatorConsoleScenarioService({} as never, queryService as never)

      await assert.rejects(
        () =>
          service.resolveScenario({
            session: {
              activeOrganizationId: 'tenant-1',
              expiresAt: new Date('2030-01-01T00:00:00.000Z'),
              token: 'session-token',
              userId: 'user-1',
            },
            user: {
              createdAt: new Date('2024-01-01T00:00:00.000Z'),
              email: 'user@example.com',
              emailVerified: true,
              id: 'user-1',
              image: null,
              isAnonymous: false,
              name: 'User',
              publicId: 'pub-user-1',
            },
          }),
        /Development tools/
      )
    } finally {
      app.container.restore(DevToolsEnvironmentService)
    }
  })
})

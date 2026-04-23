import type { ApplicationService } from '@adonisjs/core/types'

import { AuthorizationService } from '../application/authorization_service.js'
import { DevOperatorBootstrapService } from '../application/dev_operator_bootstrap_service.js'
import { DevToolsEnvironmentService } from '../application/dev_tools_environment_service.js'
import { LocalDevDestructiveToolsService } from '../application/local_dev_destructive_tools_service.js'
import { MemberService } from '../application/member_service.js'
import { AuthenticationPort } from '../domain/authentication.js'
import { BetterAuthAdapter } from '../infra/auth/better_auth_adapter.js'
import { type BetterAuthInstance, createBetterAuth } from '../infra/auth/better_auth_drizzle.js'
import { StructuredUserManagementActivitySink } from '../support/activity_log.js'
import { parseDevOperatorPublicIds } from '../support/dev_operator.js'

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    authAdapter: AuthenticationPort
    betterAuth: BetterAuthInstance
    userManagementActivitySink: StructuredUserManagementActivitySink
  }
}

export default class AuthProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {}

  register() {
    this.app.container.singleton('userManagementActivitySink', async () => {
      return new StructuredUserManagementActivitySink()
    })

    this.app.container.singleton('betterAuth', async () => {
      const drizzle = await this.app.container.make('drizzle')
      const activitySink = await this.app.container.make('userManagementActivitySink')
      return createBetterAuth(drizzle, { activitySink })
    })

    this.app.container.singleton('authAdapter', async () => {
      const betterAuthInstance = await this.app.container.make('betterAuth')
      const drizzle = await this.app.container.make('drizzle')
      const activitySink = await this.app.container.make('userManagementActivitySink')
      return new BetterAuthAdapter(betterAuthInstance, drizzle, activitySink)
    })

    this.app.container.singleton(AuthenticationPort, async () => {
      return this.app.container.make('authAdapter')
    })

    this.app.container.bind(AuthorizationService, async (resolver) => {
      const drizzle = await resolver.make('drizzle')
      return new AuthorizationService(drizzle, parseDevOperatorPublicIds())
    })

    this.app.container.bind(DevToolsEnvironmentService, async () => {
      return new DevToolsEnvironmentService()
    })

    this.app.container.bind(LocalDevDestructiveToolsService, async () => {
      return new LocalDevDestructiveToolsService()
    })

    this.app.container.bind(DevOperatorBootstrapService, async (resolver) => {
      const drizzle = await resolver.make('drizzle')
      return new DevOperatorBootstrapService(drizzle)
    })

    this.app.container.bind(MemberService, async (resolver) => {
      const drizzle = await resolver.make('drizzle')
      return new MemberService(drizzle)
    })
  }
}

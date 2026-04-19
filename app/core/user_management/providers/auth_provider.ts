import type { ApplicationService } from '@adonisjs/core/types'

import { type betterAuth } from 'better-auth'

import { AuthenticationPort } from '../domain/authentication.js'
import { BetterAuthAdapter } from '../infra/auth/better_auth_adapter.js'
import { createBetterAuth } from '../infra/auth/better_auth_drizzle.js'
import { StructuredUserManagementActivitySink } from '../support/activity_log.js'

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    authAdapter: AuthenticationPort
    betterAuth: Awaited<ReturnType<typeof betterAuth<any>>>
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
  }
}

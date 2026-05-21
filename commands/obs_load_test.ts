import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import env from '#start/env'
import { DemoCommandGuardService } from '#core/user_management/application/demo_command_guard_service'

export default class ObsLoadTest extends BaseCommand {
  static commandName = 'obs:load-test'
  static description = 'Simulate load to observe V8 behavior, CPU spikes, and event loop lag'

  static options: CommandOptions = { startApp: true }

  @flags.number({ description: 'Number of concurrent virtual users' })
  declare users: number

  @flags.number({ description: 'Duration in seconds' })
  declare duration: number

  async run() {
    // Exclude this command in production environments
    new DemoCommandGuardService().ensureTenantAllowed()

    const usersCount = this.users || 50
    const durationSec = this.duration || 15
    const appUrl = env.get('APP_URL', 'http://127.0.0.1:3333')

    this.logger.info(`Starting load test with ${usersCount} users for ${durationSec} seconds against ${appUrl}...`)
    this.logger.info(`This will mix fast GET requests and CPU-heavy POST /signin requests.`)

    let isRunning = true
    let totalRequests = 0
    let totalErrors = 0

    // Stop the simulation after the given duration
    setTimeout(() => {
      isRunning = false
      this.logger.info(`Stopping simulation... waiting for pending requests to finish.`)
    }, durationSec * 1000)

    const simulateUser = async (userId: number) => {
      while (isRunning) {
        try {
          // Pick a random action to mix load types
          const action = Math.random()
          let url = ''
          let method = 'GET'
          let body: string | undefined = undefined
          let headers: Record<string, string> = {}

          if (action < 0.3) {
            // Fast request (30%): Live check
            url = `${appUrl}/health/live`
          } else if (action < 0.6) {
            // Medium request (30%): Landing page (renders Edge template)
            url = `${appUrl}/`
          } else {
            // Heavy request (40%): Fake login.
            // This triggers Argon2/Bcrypt password hashing, which blocks the event loop and burns CPU.
            // Perfect to observe lag in /health/v8 metrics.
            url = `${appUrl}/signin`
            method = 'POST'
            headers = { 'Content-Type': 'application/json' }
            body = JSON.stringify({
              email: `fake-${userId}-${Date.now()}@example.com`,
              password: 'wrongpassword-trigger-hash',
            })
          }

          const response = await fetch(url, { method, headers, body })
          // Consume text to prevent memory leaks from unread response bodies
          await response.text()

          totalRequests++
        } catch (error) {
          totalErrors++
        }
      }
    }

    // Spin up the virtual users
    const promises = Array.from({ length: usersCount }, (_, i) => simulateUser(i))
    
    // Wait for all virtual users to finish their loop
    await Promise.all(promises)

    const rps = (totalRequests / durationSec).toFixed(2)
    this.logger.success(`Load test finished!`)
    this.logger.info(`--------------------------------`)
    this.logger.info(`Total requests sent : ${totalRequests}`)
    this.logger.info(`Total errors        : ${totalErrors}`)
    this.logger.info(`Requests per second : ${rps} req/s`)
    this.logger.info(`--------------------------------`)
    this.logger.info(`Now check your Maintenant.dev dashboard or /health/v8 to observe the impact.`)
  }
}

import type { CommandOptions } from '@adonisjs/core/types/ace'

import { DatabaseCriticalAuditTrail } from '#core/accounting/application/audit/critical_audit_trail'
import { CustomerService } from '#core/accounting/application/customers/index'
import { ExpenseService } from '#core/accounting/application/expenses/index'
import { InvoiceService } from '#core/accounting/application/invoices/index'
import { systemAccessContext } from '#core/accounting/application/support/access_context'
import { DomainError } from '#core/common/errors/domain_error'
import { DevOperatorConsoleAccountingActions } from '#core/dev_tools/application/dev_operator_console_accounting_actions'
import { DemoCommandGuardService } from '#core/user_management/application/demo_command_guard_service'
import env from '#start/env'
import { BaseCommand, flags } from '@adonisjs/core/ace'

export default class ObsLoadTest extends BaseCommand {
  static commandName = 'obs:load-test'
  static description =
    'Simulate HTTP and accounting load for V8 / event-loop observability. Creates demo records; use demo:reset after long runs.'

  static options: CommandOptions = { startApp: true }

  @flags.number({ description: 'Duration in seconds' })
  declare duration: number

  @flags.string({ description: 'Tenant / organization id to target' })
  declare tenant?: string

  @flags.number({ description: 'Number of concurrent virtual users' })
  declare users: number

  async run() {
    const tenantId = this.tenant?.trim()
    if (!tenantId) {
      throw new DomainError('The --tenant flag is required.', 'invalid_data')
    }

    // Exclude this command in production environments
    new DemoCommandGuardService().ensureTenantAllowed()

    const usersCount = this.users || 50
    const durationSec = this.duration || 15
    const appUrl = env.get('APP_URL', 'http://127.0.0.1:3333')

    const db = await this.app.container.make('drizzle')

    const organization = await db.query.organization.findFirst({
      where: (table, { eq }) => eq(table.id, tenantId),
    })
    if (!organization) {
      throw new DomainError(`Organization ${tenantId} was not found.`, 'not_found')
    }
    const access = systemAccessContext(tenantId, 'obs-load-test')

    const accountingActions = new DevOperatorConsoleAccountingActions(
      db,
      new DatabaseCriticalAuditTrail(),
      new CustomerService(db),
      new ExpenseService(db),
      new InvoiceService(db)
    )

    this.logger.info(
      `Starting load test for tenant ${tenantId} with ${usersCount} users for ${durationSec} seconds against ${appUrl}...`
    )
    this.logger.info(
      `Load profile: 70% HTTP (health, home, signin) and 30% in-process accounting writes (invoices, expenses, customers).`
    )

    let isRunning = true
    let totalRequests = 0
    let httpErrors = 0
    let dbErrors = 0
    let loggedFirstError = false

    // Stop the simulation after the given duration
    setTimeout(() => {
      isRunning = false
      this.logger.info(`Stopping simulation... waiting for pending requests to finish.`)
    }, durationSec * 1000)

    const logFirstError = (error: unknown, actionType: string) => {
      if (loggedFirstError) return
      loggedFirstError = true
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warning(`First ${actionType} load-test error: ${message}`)
    }

    const simulateUser = async (userId: number) => {
      while (isRunning) {
        try {
          // Pick a random action to mix load types
          const action = Math.random()
          let url = ''
          let method = 'GET'
          let body: string | undefined
          let headers: Record<string, string> = {}

          if (action < 0.2) {
            // Fast request (20%): Live check
            url = `${appUrl}/health/live`
          } else if (action < 0.4) {
            // Medium request (20%): Landing page (renders Edge template)
            url = `${appUrl}/`
          } else if (action < 0.7) {
            // Heavy request (30%): Fake login.
            // This triggers Argon2/Bcrypt password hashing, which blocks the event loop and burns CPU.
            // Perfect to observe lag in /health/v8 metrics.
            url = `${appUrl}/signin`
            method = 'POST'
            headers = { 'Content-Type': 'application/json' }
            body = JSON.stringify({
              email: `fake-${userId}-${Date.now()}@example.com`,
              password: 'wrongpassword-trigger-hash',
            })
          } else if (action < 0.8) {
            // Credible Background Activity (10%): Create Invoices
            try {
              await accountingActions.createInvoiceBatch(access, 1)
              totalRequests++
            } catch (error) {
              dbErrors++
              logFirstError(error, 'invoice')
            }
            continue
          } else if (action < 0.9) {
            // Credible Background Activity (10%): Create Expenses
            try {
              await accountingActions.createExpenseBatch(access, 1)
              totalRequests++
            } catch (error) {
              dbErrors++
              logFirstError(error, 'expense')
            }
            continue
          } else {
            // Credible Background Activity (10%): Create Customers
            try {
              await accountingActions.createCustomerBatch(access, 1)
              totalRequests++
            } catch (error) {
              dbErrors++
              logFirstError(error, 'customer')
            }
            continue
          }

          const response = await fetch(url, { body, headers, method })
          // Consume text to prevent memory leaks from unread response bodies
          await response.text()

          totalRequests++
        } catch (error) {
          httpErrors++
          logFirstError(error, 'http')
        }
      }
    }

    // Spin up the virtual users
    const promises = Array.from({ length: usersCount }, (_, i) => simulateUser(i))

    // Wait for all virtual users to finish their loop
    await Promise.all(promises)

    const totalErrors = httpErrors + dbErrors
    const rps = (totalRequests / durationSec).toFixed(2)
    this.logger.success(`Load test finished!`)
    this.logger.info(`--------------------------------`)
    this.logger.info(`Tenant targeted     : ${tenantId}`)
    this.logger.info(`Total requests sent : ${totalRequests}`)
    this.logger.info(`Total errors        : ${totalErrors} (HTTP: ${httpErrors}, DB: ${dbErrors})`)
    this.logger.info(`Requests per second : ${rps} req/s`)
    this.logger.info(`--------------------------------`)
    this.logger.info(`Now check your Maintenant.dev dashboard or /health/v8 to observe the impact.`)
  }
}

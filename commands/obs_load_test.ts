import type { CommandOptions } from '@adonisjs/core/types/ace'

import { DatabaseCriticalAuditTrail } from '#core/accounting/application/audit/critical_audit_trail'
import { CustomerService } from '#core/accounting/application/customers/index'
import { ExpenseService } from '#core/accounting/application/expenses/index'
import { InvoiceService } from '#core/accounting/application/invoices/index'
import { systemAccessContext } from '#core/accounting/application/support/access_context'
import { DomainError } from '#core/common/errors/domain_error'
import { DevOperatorConsoleAccountingActions } from '#core/dev_tools/application/dev_operator_console_accounting_actions'
import { generateDevPassword } from '#core/dev_tools/application/dev_password'
import { DemoCommandGuardService } from '#core/user_management/application/demo_command_guard_service'
import env from '#start/env'
import { BaseCommand, flags } from '@adonisjs/core/ace'

export default class ObsLoadTest extends BaseCommand {
  static readonly commandName = 'obs:load-test'
  static readonly description =
    'Simulate HTTP and accounting load for V8 / event-loop observability. Creates demo records; use demo:reset after long runs.'

  static readonly options: CommandOptions = { startApp: true }

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
      const message = error instanceof Error ? error.message : JSON.stringify(error)
      this.logger.warning(`First ${actionType} load-test error: ${message}`)
    }

    const performDbAction = async (action: number) => {
      try {
        if (action < 0.8) {
          await accountingActions.createInvoiceBatch(access, 1)
        } else if (action < 0.9) {
          await accountingActions.createExpenseBatch(access, 1)
        } else {
          await accountingActions.createCustomerBatch(access, 1)
        }
        totalRequests++
      } catch (error) {
        dbErrors++
        logFirstError(error, action < 0.8 ? 'invoice' : action < 0.9 ? 'expense' : 'customer')
      }
    }

    const performHttpAction = async (userId: number, action: number) => {
      try {
        let url = `${appUrl}/health/live`
        let method = 'GET'
        let body: string | undefined
        let headers: Record<string, string> = {}

        if (action >= 0.2 && action < 0.4) {
          url = `${appUrl}/`
        } else if (action >= 0.4) {
          url = `${appUrl}/signin`
          method = 'POST'
          headers = { 'Content-Type': 'application/json' }
          body = JSON.stringify({
            email: `fake-${userId}-${Date.now()}@example.com`,
            password: generateDevPassword(),
          })
        }

        const response = await fetch(url, { body, headers, method })
        await response.text()
        totalRequests++
      } catch (error) {
        httpErrors++
        logFirstError(error, 'http')
      }
    }

    const simulateUser = async (userId: number) => {
      while (isRunning) {
        const action = Math.random()
        if (action < 0.7) {
          await performHttpAction(userId, action)
        } else {
          await performDbAction(action)
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

import type { ApplicationService } from '@adonisjs/core/types'

import { CustomerService } from '#core/accounting/application/customers/index'
import { DemoDatasetService } from '#core/accounting/application/demo/demo_dataset_service'
import { ExpenseService } from '#core/accounting/application/expenses/index'
import { InvoiceService } from '#core/accounting/application/invoices/index'
import { DeferredDatabaseResetLauncher } from '#core/dev_tools/application/deferred_database_reset_launcher'
import { DevOperatorConsoleQueryService } from '#core/dev_tools/application/dev_operator_console_query_service'
import { DevOperatorConsoleService } from '#core/dev_tools/application/dev_operator_console_service'
import { LocalDevDestructiveToolsService } from '#core/user_management/application/local_dev_destructive_tools_service'
import { MemberService } from '#core/user_management/application/member_service'

export default class DevToolsProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.bind(DevOperatorConsoleService, async (resolver) => {
      const db = await resolver.make('drizzle')
      const customerService = await resolver.make(CustomerService)
      const demoDatasetService = await resolver.make(DemoDatasetService)
      const expenseService = await resolver.make(ExpenseService)
      const invoiceService = await resolver.make(InvoiceService)
      const localDevDestructiveTools = await resolver.make(LocalDevDestructiveToolsService)
      const memberService = await resolver.make(MemberService)
      const queryService = new DevOperatorConsoleQueryService(db)

      return new DevOperatorConsoleService(db, {
        customerService,
        databaseResetLauncher: new DeferredDatabaseResetLauncher(),
        demoDatasetService,
        expenseService,
        invoiceService,
        localDevDestructiveTools,
        memberService,
        queryService,
      })
    })
  }
}

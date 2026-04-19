import type { DateFilter } from '#core/accounting/application/expenses/index'
import type { AccountingActivitySink } from '#core/accounting/application/support/activity_log'
import type { AccountingServiceDependencies } from '#core/accounting/application/support/service_dependencies'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import {
  type AccountingAccessContext,
  SYSTEM_ACCOUNTING_ACCESS_CONTEXT,
} from '#core/accounting/application/support/access_context'
import {
  type AccountingBusinessCalendar,
  SystemAccountingBusinessCalendar,
} from '#core/accounting/application/support/business_calendar'
import { clampInteger } from '#core/accounting/application/support/pagination'

import type {
  CustomerForSelectDto,
  InvoiceConcurrencyHooks,
  InvoiceDto,
  InvoiceListResult,
  InvoiceListScopeInput,
  InvoiceRequestContext,
  InvoiceSummaryDto,
  IssueInvoiceInput,
  SaveInvoiceDraftInput,
} from './types.js'

import { cancelInvoiceUseCase } from './application/cancel_invoice.js'
import { createInvoiceUseCase } from './application/create_invoice.js'
import { markInvoicePaidUseCase } from './application/mark_invoice_paid.js'
import { sendInvoiceUseCase } from './application/send_invoice.js'
import { updateInvoiceDraftUseCase } from './application/update_invoice_draft.js'
import { toInvoiceDto, toLineDto } from './infrastructure/invoice_mappers.js'
import {
  findFirstInvoiceIdForCustomer,
  getInvoiceById,
  getInvoiceForListScope as getInvoiceForListScopeQuery,
  getInvoiceSummary as getInvoiceSummaryQuery,
  listCustomersForSelect as listCustomersForSelectQuery,
  listInvoiceLinesForInvoice,
  listInvoiceLinesForInvoiceIds,
  listInvoicesByTenant,
} from './infrastructure/invoice_queries.js'

const MAX_PER_PAGE = 100
const MIN_PER_PAGE = 1

export class InvoiceService {
  private readonly activitySink?: AccountingActivitySink
  private readonly businessCalendar: AccountingBusinessCalendar

  constructor(
    private readonly db: PostgresJsDatabase<any>,
    dependencies: AccountingServiceDependencies = {}
  ) {
    this.activitySink = dependencies.activitySink
    this.businessCalendar = dependencies.businessCalendar ?? new SystemAccountingBusinessCalendar()
  }

  async createDraft(
    input: SaveInvoiceDraftInput,
    access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<InvoiceDto> {
    return createInvoiceUseCase(this.dependencies(), input, toInvoiceRequestContext(access))
  }

  async deleteDraft(
    id: string,
    access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<void> {
    await cancelInvoiceUseCase(this.dependencies(), id, toInvoiceRequestContext(access))
  }

  async findFirstInvoiceIdForCustomer(
    customerId: string,
    dateFilter?: DateFilter,
    access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<null | string> {
    return findFirstInvoiceIdForCustomer(this.db, {
      customerId,
      dateFilter,
      tenantId: toInvoiceRequestContext(access).tenantId,
    })
  }

  async getInvoiceById(
    id: string,
    access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<InvoiceDto | null> {
    const requestContext = toInvoiceRequestContext(access)
    const row = await getInvoiceById(this.db, { id, tenantId: requestContext.tenantId })
    if (!row) return null
    const lines = await listInvoiceLinesForInvoice(this.db, id, requestContext.tenantId)
    return toInvoiceDto(
      row,
      lines.map(toLineDto),
      this.businessCalendar.dateFromTimestamp(row.createdAt)
    )
  }

  async getInvoiceForListScope(
    id: string,
    scope: InvoiceListScopeInput,
    access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<InvoiceDto | null> {
    const requestContext = toInvoiceRequestContext(access)
    const row = await getInvoiceForListScopeQuery(this.db, {
      id,
      scope,
      tenantId: requestContext.tenantId,
    })
    if (!row) return null
    const lines = await listInvoiceLinesForInvoice(this.db, id, requestContext.tenantId)
    return toInvoiceDto(
      row,
      lines.map(toLineDto),
      this.businessCalendar.dateFromTimestamp(row.createdAt)
    )
  }

  async getInvoiceSummary(
    dateFilter?: DateFilter,
    access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<InvoiceSummaryDto> {
    return getInvoiceSummaryQuery(this.db, {
      filter: dateFilter,
      tenantId: toInvoiceRequestContext(access).tenantId,
      today: this.businessCalendar.today(),
    })
  }

  async issueInvoice(
    id: string,
    input: IssueInvoiceInput,
    hooks?: InvoiceConcurrencyHooks,
    access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<InvoiceDto> {
    return sendInvoiceUseCase(
      this.dependencies(),
      id,
      input,
      hooks,
      toInvoiceRequestContext(access)
    )
  }

  async listCustomersForSelect(
    _access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<CustomerForSelectDto[]> {
    return listCustomersForSelectQuery(this.db)
  }

  async listInvoices(
    page = 1,
    perPage = 5,
    dateFilter?: DateFilter,
    access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<InvoiceListResult> {
    const requestContext = toInvoiceRequestContext(access)
    const safePerPage = clampInteger(perPage, MIN_PER_PAGE, MAX_PER_PAGE)
    const { totalCount } = await listInvoicesByTenant(this.db, {
      dateFilter,
      page: 1,
      perPage: 1,
      tenantId: requestContext.tenantId,
    })
    const totalPages = Math.max(1, Math.ceil(totalCount / safePerPage))
    const safePage = clampInteger(page, 1, totalPages)
    const { rows } = await listInvoicesByTenant(this.db, {
      dateFilter,
      page: safePage,
      perPage: safePerPage,
      tenantId: requestContext.tenantId,
    })

    if (rows.length === 0) {
      return {
        items: [],
        pagination: {
          page: safePage,
          perPage: safePerPage,
          totalItems: totalCount,
          totalPages,
        },
      }
    }

    const ids = rows.map((row) => row.id)
    const lineRows = await listInvoiceLinesForInvoiceIds(this.db, ids, requestContext.tenantId)
    const items = rows.map((invoice) =>
      toInvoiceDto(
        invoice,
        lineRows.filter((line) => line.invoiceId === invoice.id).map(toLineDto),
        this.businessCalendar.dateFromTimestamp(invoice.createdAt)
      )
    )

    return {
      items,
      pagination: {
        page: safePage,
        perPage: safePerPage,
        totalItems: totalCount,
        totalPages,
      },
    }
  }

  async markInvoicePaid(
    id: string,
    hooks?: InvoiceConcurrencyHooks,
    access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<InvoiceDto> {
    return markInvoicePaidUseCase(this.dependencies(), id, hooks, toInvoiceRequestContext(access))
  }

  async updateDraft(
    id: string,
    input: SaveInvoiceDraftInput,
    hooks?: InvoiceConcurrencyHooks,
    access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<InvoiceDto> {
    return updateInvoiceDraftUseCase(
      this.dependencies(),
      id,
      input,
      hooks,
      toInvoiceRequestContext(access)
    )
  }

  private dependencies() {
    return {
      activitySink: this.activitySink,
      businessCalendar: this.businessCalendar,
      db: this.db,
    }
  }
}

function toInvoiceRequestContext(access: AccountingAccessContext): InvoiceRequestContext {
  return { ...access, tenantId: null }
}

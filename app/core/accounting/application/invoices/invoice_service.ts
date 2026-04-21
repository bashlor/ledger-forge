import type { DateFilter } from '#core/accounting/application/expenses/index'
import type { AccountingActivitySink } from '#core/accounting/application/support/activity_log'
import type { AccountingServiceDependencies } from '#core/accounting/application/support/service_dependencies'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { listAuditEventsForEntity } from '#core/accounting/application/audit/audit_queries'
import {
  type CriticalAuditTrail,
  DatabaseCriticalAuditTrail,
} from '#core/accounting/application/audit/critical_audit_trail'
import { type AccountingAccessContext } from '#core/accounting/application/support/access_context'
import {
  type AccountingBusinessCalendar,
  SystemAccountingBusinessCalendar,
} from '#core/accounting/application/support/business_calendar'
import {
  clampInteger,
  DEFAULT_LIST_PER_PAGE,
  MAX_LIST_PER_PAGE,
  MIN_LIST_PER_PAGE,
} from '#core/accounting/application/support/pagination'

import type {
  AuditEventDto,
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

export class InvoiceService {
  private readonly activitySink?: AccountingActivitySink
  private readonly auditTrail: CriticalAuditTrail
  private readonly businessCalendar: AccountingBusinessCalendar

  constructor(
    private readonly db: PostgresJsDatabase<any>,
    dependencies: AccountingServiceDependencies = {}
  ) {
    this.activitySink = dependencies.activitySink
    this.auditTrail = dependencies.auditTrail ?? new DatabaseCriticalAuditTrail()
    this.businessCalendar = dependencies.businessCalendar ?? new SystemAccountingBusinessCalendar()
  }

  async createDraft(
    input: SaveInvoiceDraftInput,
    access: AccountingAccessContext
  ): Promise<InvoiceDto> {
    return createInvoiceUseCase(this.dependencies(), input, toInvoiceRequestContext(access))
  }

  async deleteDraft(id: string, access: AccountingAccessContext): Promise<void> {
    await cancelInvoiceUseCase(this.dependencies(), id, toInvoiceRequestContext(access))
  }

  async findFirstInvoiceIdForCustomer(
    customerId: string,
    access: AccountingAccessContext,
    dateFilter?: DateFilter
  ): Promise<null | string> {
    return findFirstInvoiceIdForCustomer(this.db, {
      customerId,
      dateFilter,
      tenantId: toInvoiceRequestContext(access).tenantId,
    })
  }

  async getInvoiceById(id: string, access: AccountingAccessContext): Promise<InvoiceDto | null> {
    const requestContext = toInvoiceRequestContext(access)
    const row = await getInvoiceById(this.db, { id, tenantId: requestContext.tenantId })
    if (!row) return null
    const lines = await listInvoiceLinesForInvoice(this.db, id)
    return toInvoiceDto(
      row,
      lines.map(toLineDto),
      this.businessCalendar.dateFromTimestamp(row.createdAt)
    )
  }

  async getInvoiceForListScope(
    id: string,
    scope: InvoiceListScopeInput,
    access: AccountingAccessContext
  ): Promise<InvoiceDto | null> {
    const requestContext = toInvoiceRequestContext(access)
    const row = await getInvoiceForListScopeQuery(this.db, {
      id,
      scope,
      tenantId: requestContext.tenantId,
    })
    if (!row) return null
    const lines = await listInvoiceLinesForInvoice(this.db, id)
    return toInvoiceDto(
      row,
      lines.map(toLineDto),
      this.businessCalendar.dateFromTimestamp(row.createdAt)
    )
  }

  async getInvoiceSummary(
    access: AccountingAccessContext,
    dateFilter?: DateFilter,
    customerId?: string
  ): Promise<InvoiceSummaryDto> {
    return getInvoiceSummaryQuery(this.db, {
      customerId,
      filter: dateFilter,
      tenantId: toInvoiceRequestContext(access).tenantId,
      today: this.businessCalendar.today(),
    })
  }

  async issueInvoice(
    id: string,
    input: IssueInvoiceInput,
    access: AccountingAccessContext,
    hooks?: InvoiceConcurrencyHooks
  ): Promise<InvoiceDto> {
    return sendInvoiceUseCase(
      this.dependencies(),
      id,
      input,
      toInvoiceRequestContext(access),
      hooks
    )
  }

  async listAuditEventsForInvoice(
    id: string,
    access: AccountingAccessContext
  ): Promise<AuditEventDto[]> {
    const requestContext = toInvoiceRequestContext(access)
    return listAuditEventsForEntity(this.db, {
      entityId: id,
      entityType: 'invoice',
      tenantId: requestContext.tenantId,
    })
  }

  async listCustomersForSelect(access: AccountingAccessContext): Promise<CustomerForSelectDto[]> {
    return listCustomersForSelectQuery(this.db, toInvoiceRequestContext(access).tenantId)
  }

  async listInvoices(
    page = 1,
    perPage = DEFAULT_LIST_PER_PAGE,
    access: AccountingAccessContext,
    dateFilter?: DateFilter,
    customerId?: string,
    search?: string
  ): Promise<InvoiceListResult> {
    const requestContext = toInvoiceRequestContext(access)
    const safePerPage = clampInteger(perPage, MIN_LIST_PER_PAGE, MAX_LIST_PER_PAGE)
    const { totalCount } = await listInvoicesByTenant(this.db, {
      customerId,
      dateFilter,
      page: 1,
      perPage: 1,
      search,
      tenantId: requestContext.tenantId,
    })
    const totalPages = Math.max(1, Math.ceil(totalCount / safePerPage))
    const safePage = clampInteger(page, 1, totalPages)
    const { rows } = await listInvoicesByTenant(this.db, {
      customerId,
      dateFilter,
      page: safePage,
      perPage: safePerPage,
      search,
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
    const lineRows = await listInvoiceLinesForInvoiceIds(this.db, ids)
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
    access: AccountingAccessContext,
    hooks?: InvoiceConcurrencyHooks
  ): Promise<InvoiceDto> {
    return markInvoicePaidUseCase(this.dependencies(), id, toInvoiceRequestContext(access), hooks)
  }

  async updateDraft(
    id: string,
    input: SaveInvoiceDraftInput,
    access: AccountingAccessContext,
    hooks?: InvoiceConcurrencyHooks
  ): Promise<InvoiceDto> {
    return updateInvoiceDraftUseCase(
      this.dependencies(),
      id,
      input,
      toInvoiceRequestContext(access),
      hooks
    )
  }

  private dependencies() {
    return {
      activitySink: this.activitySink,
      auditTrail: this.auditTrail,
      businessCalendar: this.businessCalendar,
      db: this.db,
    }
  }
}

function toInvoiceRequestContext(access: AccountingAccessContext): InvoiceRequestContext {
  return { ...access }
}

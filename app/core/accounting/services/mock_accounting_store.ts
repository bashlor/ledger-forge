export interface CreateCustomerRequest {
  address: string
  company: string
  email: string
  name: string
  note?: string
  phone: string
}

export interface CustomerResponse {
  address: string
  canDelete: boolean
  company: string
  deleteBlockReason?: string
  email: string
  id: string
  invoiceCount: number
  name: string
  note?: string
  phone: string
  totalInvoiced: number
}

export interface DashboardRecentInvoiceResponse {
  customerCompanyName: string
  date: string
  dueDate: string
  id: string
  invoiceNumber: string
  status: InvoiceStatus
  totalInclTax: number
}

export interface DashboardResponse {
  recentInvoices: DashboardRecentInvoiceResponse[]
  summary: {
    profit: number
    totalCollected: number
    totalExpenses: number
    totalRevenue: number
  }
}

export interface ExpenseResponse {
  amount: number
  canConfirm: boolean
  canDelete: boolean
  category: string
  date: string
  id: string
  label: string
  status: ExpenseStatus
}

export type ExpenseStatus = 'confirmed' | 'draft'

export interface InvoiceLineRequest {
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
}

export interface InvoiceLineResponse extends InvoiceLineRequest {
  id: string
  lineTotalExclTax: number
  lineTotalInclTax: number
  lineVatAmount: number
}
export interface InvoiceResponse {
  customerCompanyAddressSnapshot: string
  customerCompanyName: string
  customerCompanySnapshot: string
  customerEmailSnapshot: string
  customerId: string
  customerPhoneSnapshot: string
  customerPrimaryContactSnapshot: string
  dueDate: string
  id: string
  invoiceNumber: string
  issueDate: string
  issuedCompanyAddress: string
  issuedCompanyName: string
  lines: InvoiceLineResponse[]
  status: InvoiceStatus
  subtotalExclTax: number
  totalInclTax: number
  totalVat: number
}

export type InvoiceStatus = 'draft' | 'issued' | 'paid'

interface CreateExpenseRequest {
  amount: number
  category: string
  date: string
  label: string
}

interface SaveInvoiceDraftRequest {
  customerId: string
  dueDate: string
  issueDate: string
  lines: InvoiceLineRequest[]
}

class CustomerInvoicesConflictError extends Error {
  override name = 'CustomerInvoicesConflictError'
}

class InvoiceNotFoundError extends Error {
  override name = 'InvoiceNotFoundError'
}

class MockAccountingStore {
  private readonly customersSeed: CustomerResponse[] = [
    {
      address: '12 rue des Cerisiers, 75011 Paris',
      canDelete: true,
      company: 'Northwind Studio',
      email: 'sarah@northwind.test',
      id: 'client-1',
      invoiceCount: 0,
      name: 'Sarah Chen',
      note: 'Recurring client',
      phone: '+33 6 11 22 33 44',
      totalInvoiced: 0,
    },
    {
      address: '8 avenue Victor Hugo, 69002 Lyon',
      canDelete: true,
      company: 'Atelier Horizon',
      email: 'marc@horizon.test',
      id: 'client-2',
      invoiceCount: 0,
      name: 'Marc Dubois',
      phone: '+33 6 55 66 77 88',
      totalInvoiced: 0,
    },
    {
      address: '42 quai des Arts, 33000 Bordeaux',
      canDelete: true,
      company: 'Kestrel Analytics',
      email: 'nina@kestrel.test',
      id: 'client-3',
      invoiceCount: 0,
      name: 'Nina Rossi',
      note: 'Client onboarding',
      phone: '+33 6 20 30 40 50',
      totalInvoiced: 0,
    },
  ]

  private customers = [...this.customersSeed]

  private expenses: ExpenseResponse[] = [
    {
      amount: 18,
      canConfirm: false,
      canDelete: false,
      category: 'Software',
      date: '2026-04-02',
      id: 'expense-1',
      label: 'Figma',
      status: 'confirmed',
    },
    {
      amount: 220,
      canConfirm: true,
      canDelete: true,
      category: 'Office',
      date: '2026-04-01',
      id: 'expense-2',
      label: 'Coworking',
      status: 'draft',
    },
    {
      amount: 146,
      canConfirm: false,
      canDelete: false,
      category: 'Infrastructure',
      date: '2026-03-29',
      id: 'expense-3',
      label: 'Amazon Web Services',
      status: 'confirmed',
    },
  ]

  private invoices: InvoiceResponse[] = [
    buildInvoice(
      {
        customerId: 'client-1',
        dueDate: '2026-04-15',
        issueDate: '2026-04-01',
        lines: [
          { description: 'Monthly bookkeeping', quantity: 1, unitPrice: 1600, vatRate: 20 },
          { description: 'VAT advisory', quantity: 1, unitPrice: 400, vatRate: 20 },
        ],
      },
      {
        customerCompanyAddressSnapshot: '12 rue des Cerisiers, 75011 Paris',
        customerCompanyName: 'Northwind Studio',
        customerCompanySnapshot: 'Northwind Studio',
        customerEmailSnapshot: 'sarah@northwind.test',
        customerId: 'client-1',
        customerPhoneSnapshot: '+33 6 11 22 33 44',
        customerPrimaryContactSnapshot: 'Sarah Chen',
        dueDate: '2026-04-15',
        id: 'invoice-1',
        invoiceNumber: 'INV-2026-001',
        issueDate: '2026-04-01',
        issuedCompanyAddress: '12 rue des Cerisiers, 75011 Paris',
        issuedCompanyName: 'Northwind Studio',
        status: 'issued',
      }
    ),
    buildInvoice(
      {
        customerId: 'client-2',
        dueDate: '2026-04-10',
        issueDate: '2026-03-20',
        lines: [
          { description: 'Quarter-end close', quantity: 1, unitPrice: 1200, vatRate: 20 },
          { description: 'Cash flow review', quantity: 2, unitPrice: 150, vatRate: 20 },
        ],
      },
      {
        customerCompanyAddressSnapshot: '8 avenue Victor Hugo, 69002 Lyon',
        customerCompanyName: 'Atelier Horizon',
        customerCompanySnapshot: 'Atelier Horizon',
        customerEmailSnapshot: 'marc@horizon.test',
        customerId: 'client-2',
        customerPhoneSnapshot: '+33 6 55 66 77 88',
        customerPrimaryContactSnapshot: 'Marc Dubois',
        dueDate: '2026-04-10',
        id: 'invoice-2',
        invoiceNumber: 'INV-2026-002',
        issueDate: '2026-03-20',
        issuedCompanyAddress: '8 avenue Victor Hugo, 69002 Lyon',
        issuedCompanyName: 'Atelier Horizon',
        status: 'paid',
      }
    ),
    buildInvoice(
      {
        customerId: 'client-3',
        dueDate: '2026-04-18',
        issueDate: '2026-04-03',
        lines: [
          {
            description: 'Revenue recognition review',
            quantity: 1,
            unitPrice: 850,
            vatRate: 20,
          },
          { description: 'Reporting setup', quantity: 3, unitPrice: 120, vatRate: 20 },
        ],
      },
      {
        customerCompanyAddressSnapshot: '42 quai des Arts, 33000 Bordeaux',
        customerCompanyName: 'Kestrel Analytics',
        customerCompanySnapshot: 'Kestrel Analytics',
        customerEmailSnapshot: 'nina@kestrel.test',
        customerId: 'client-3',
        customerPhoneSnapshot: '+33 6 20 30 40 50',
        customerPrimaryContactSnapshot: 'Nina Rossi',
        dueDate: '2026-04-18',
        id: 'invoice-3',
        invoiceNumber: 'INV-2026-003',
        issueDate: '2026-04-03',
        issuedCompanyAddress: '',
        issuedCompanyName: '',
        status: 'draft',
      }
    ),
  ]

  confirmExpense(id: string) {
    const current = this.expenses.find((expense) => expense.id === id)
    if (!current) {
      throw new Error('Expense not found.')
    }
    if (current.status !== 'draft') {
      throw new Error('Only draft expenses can be confirmed.')
    }

    const updated = {
      ...current,
      canConfirm: false,
      canDelete: false,
      status: 'confirmed',
    } satisfies ExpenseResponse

    this.expenses = this.expenses.map((expense) => (expense.id === id ? updated : expense))
    return updated
  }

  createCustomer(payload: Partial<CreateCustomerRequest>): CustomerResponse {
    const address = payload.address?.trim() ?? ''
    const company = payload.company?.trim() ?? ''
    const email = payload.email?.trim() ?? ''
    const name = payload.name?.trim() ?? ''
    const note = payload.note?.trim() || undefined
    const phone = payload.phone?.trim() ?? ''

    if (!address || !company || !email || !name || !phone) {
      throw new Error('All required customer fields must be provided.')
    }

    const customer = {
      address,
      canDelete: true,
      company,
      email,
      id: `client-${crypto.randomUUID()}`,
      invoiceCount: 0,
      name,
      note,
      phone,
      totalInvoiced: 0,
    } satisfies CustomerResponse

    this.customers = [customer, ...this.customers]
    return customer
  }

  createDraft(payload: Partial<SaveInvoiceDraftRequest>) {
    const request = this.validateDraftRequest(payload)
    const customer = this.getCustomerOrThrow(request.customerId)

    const invoice = buildInvoice(request, {
      customerCompanyAddressSnapshot: customer.address,
      customerCompanyName: customer.company,
      customerCompanySnapshot: customer.company,
      customerEmailSnapshot: customer.email,
      customerId: request.customerId,
      customerPhoneSnapshot: customer.phone,
      customerPrimaryContactSnapshot: customer.name,
      dueDate: request.dueDate,
      id: `invoice-${crypto.randomUUID()}`,
      invoiceNumber: this.nextInvoiceNumber(request.issueDate),
      issueDate: request.issueDate,
      issuedCompanyAddress: '',
      issuedCompanyName: '',
      status: 'draft',
    })

    this.invoices = [invoice, ...this.invoices]
    return invoice
  }

  createExpense(payload: Partial<CreateExpenseRequest>) {
    const amount = Number(payload.amount)
    const category = payload.category?.trim() ?? ''
    const date = payload.date?.trim() ?? ''
    const label = payload.label?.trim() ?? ''

    if (!label || !category || !date || !Number.isFinite(amount) || amount < 0) {
      throw new Error('The expense is invalid.')
    }

    const expense = {
      amount: roundCurrency(amount),
      canConfirm: true,
      canDelete: true,
      category,
      date,
      id: `expense-${crypto.randomUUID()}`,
      label,
      status: 'draft',
    } satisfies ExpenseResponse

    this.expenses = [expense, ...this.expenses]
    return expense
  }

  deleteCustomer(id: string) {
    if (this.invoices.some((invoice) => invoice.customerId === id)) {
      throw new CustomerInvoicesConflictError(
        'This customer is referenced by one or more invoices.'
      )
    }

    const before = this.customers.length
    this.customers = this.customers.filter((customer) => customer.id !== id)

    if (before === this.customers.length) {
      throw new Error('Customer not found.')
    }
  }

  deleteDraft(id: string) {
    this.getDraftInvoiceOrThrow(id)
    this.invoices = this.invoices.filter((invoice) => invoice.id !== id)
  }

  deleteExpense(id: string) {
    const current = this.expenses.find((expense) => expense.id === id)
    if (!current) {
      throw new Error('Expense not found.')
    }
    if (current.status !== 'draft') {
      throw new Error('Only draft expenses can be deleted.')
    }

    const before = this.expenses.length
    this.expenses = this.expenses.filter((expense) => expense.id !== id)
    if (before === this.expenses.length) {
      throw new Error('Expense not found.')
    }
  }

  getDashboard(): DashboardResponse {
    const revenueInvoices = this.invoices.filter((invoice) => invoice.status !== 'draft')
    const paidInvoices = this.invoices.filter((invoice) => invoice.status === 'paid')
    const totalRevenue = roundCurrency(
      revenueInvoices.reduce((sum, invoice) => sum + invoice.totalInclTax, 0)
    )
    const totalCollected = roundCurrency(
      paidInvoices.reduce((sum, invoice) => sum + invoice.totalInclTax, 0)
    )
    const totalExpenses = roundCurrency(
      this.expenses
        .filter((expense) => expense.status === 'confirmed')
        .reduce((sum, expense) => sum + expense.amount, 0)
    )
    const profit = roundCurrency(totalRevenue - totalExpenses)

    return {
      recentInvoices: [...this.invoices]
        .sort((left, right) => {
          const byDate = sortDateDesc(left.issueDate, right.issueDate)
          return byDate === 0 ? right.invoiceNumber.localeCompare(left.invoiceNumber) : byDate
        })
        .slice(0, 6)
        .map((invoice) => ({
          customerCompanyName: invoice.customerCompanyName,
          date: invoice.issueDate,
          dueDate: invoice.dueDate,
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          totalInclTax: invoice.totalInclTax,
        })),
      summary: {
        profit,
        totalCollected,
        totalExpenses,
        totalRevenue,
      },
    }
  }

  issueInvoice(id: string, payload: { issuedCompanyAddress: string; issuedCompanyName: string }) {
    const current = this.getDraftInvoiceOrThrow(id)
    const customer = this.getCustomerOrThrow(current.customerId)
    if (!customer.address.trim()) {
      throw new Error('Customer address is required before issuing an invoice.')
    }
    const today = new Date().toISOString().slice(0, 10)
    if (current.dueDate < today) {
      throw new Error('Due date must be today or later to save or issue an invoice.')
    }
    const updated = {
      ...current,
      customerCompanyAddressSnapshot: customer.address,
      customerCompanyName: customer.company,
      customerCompanySnapshot: customer.company,
      customerEmailSnapshot: customer.email,
      customerPhoneSnapshot: customer.phone,
      customerPrimaryContactSnapshot: customer.name,
      issuedCompanyAddress: payload.issuedCompanyAddress.trim(),
      issuedCompanyName: payload.issuedCompanyName.trim(),
      status: 'issued',
    } satisfies InvoiceResponse
    this.replaceInvoice(updated)
    return updated
  }

  listCustomers(): CustomerResponse[] {
    return [...this.customers]
      .map((customer) => {
        const invoices = this.invoices.filter((invoice) => invoice.customerId === customer.id)
        const invoiceCount = invoices.length
        const totalInvoiced = roundCurrency(
          invoices
            .filter((invoice) => invoice.status !== 'draft')
            .reduce((sum, invoice) => sum + invoice.totalInclTax, 0)
        )
        const canDelete = invoiceCount === 0

        return {
          ...customer,
          canDelete,
          deleteBlockReason: canDelete
            ? undefined
            : 'This customer is referenced by one or more invoices.',
          invoiceCount,
          totalInvoiced,
        }
      })
      .sort((left, right) => left.company.localeCompare(right.company))
  }

  listCustomersPage(page = 1, perPage = 5) {
    const all = this.listCustomers()
    const totalItems = all.length
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage))
    const safePage = Math.min(Math.max(page, 1), totalPages)
    const start = (safePage - 1) * perPage
    const items = all.slice(start, start + perPage)
    const linkedCustomers = all.filter((customer) => (customer.invoiceCount ?? 0) > 0).length
    const totalInvoiced = roundCurrency(
      all.reduce((sum, customer) => sum + (customer.totalInvoiced ?? 0), 0)
    )

    return {
      items,
      pagination: {
        page: safePage,
        perPage,
        totalItems,
        totalPages,
      },
      summary: {
        linkedCustomers,
        totalCount: totalItems,
        totalInvoiced,
      },
    }
  }

  listExpenses(page = 1, perPage = 5) {
    const items = [...this.expenses].sort((left, right) => {
      const byDate = sortDateDesc(left.date, right.date)
      return byDate === 0 ? left.label.localeCompare(right.label) : byDate
    })
    const confirmedCount = items.filter((expense) => expense.status === 'confirmed').length
    const draftCount = items.filter((expense) => expense.status === 'draft').length
    const totalAmount = roundCurrency(
      items
        .filter((expense) => expense.status === 'confirmed')
        .reduce((sum, expense) => sum + expense.amount, 0)
    )

    const totalItems = items.length
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage))
    const safePage = Math.min(Math.max(page, 1), totalPages)
    const start = (safePage - 1) * perPage

    return {
      items: items.slice(start, start + perPage),
      pagination: {
        page: safePage,
        perPage,
        totalItems,
        totalPages,
      },
      summary: {
        confirmedCount,
        draftCount,
        totalAmount,
        totalCount: totalItems,
      },
    }
  }

  listInvoices(): InvoiceResponse[] {
    return [...this.invoices].sort((left, right) => {
      const byDate = sortDateDesc(left.issueDate, right.issueDate)
      return byDate === 0 ? right.invoiceNumber.localeCompare(left.invoiceNumber) : byDate
    })
  }

  markInvoicePaid(id: string) {
    const current = this.invoices.find((invoice) => invoice.id === id)
    if (!current) {
      throw new InvoiceNotFoundError('Invoice not found.')
    }

    if (current.status !== 'issued') {
      throw new Error('Only issued invoices can be marked as paid.')
    }

    const updated = { ...current, status: 'paid' } satisfies InvoiceResponse
    this.replaceInvoice(updated)
    return updated
  }

  updateCustomer(id: string, payload: Partial<CreateCustomerRequest>): CustomerResponse {
    const address = payload.address?.trim() ?? ''
    const company = payload.company?.trim() ?? ''
    const email = payload.email?.trim() ?? ''
    const name = payload.name?.trim() ?? ''
    const note = payload.note?.trim() || undefined
    const phone = payload.phone?.trim() ?? ''

    if (!address || !company || !email || !name || !phone) {
      throw new Error('All required customer fields must be provided.')
    }

    const index = this.customers.findIndex((customer) => customer.id === id)
    if (index === -1) {
      throw new Error('Customer not found.')
    }

    const previous = this.customers[index]
    const snapshotChanged =
      previous.address !== address ||
      previous.company !== company ||
      previous.email !== email ||
      previous.name !== name ||
      previous.phone !== phone

    const updated = {
      ...previous,
      address,
      company,
      email,
      name,
      note,
      phone,
    } satisfies CustomerResponse

    this.customers = this.customers.map((customer, entryIndex) =>
      entryIndex === index ? updated : customer
    )

    if (snapshotChanged) {
      this.invoices = this.invoices.map((invoice) =>
        invoice.customerId === id && invoice.status === 'draft'
          ? {
              ...invoice,
              customerCompanyAddressSnapshot: address,
              customerCompanyName: company,
              customerCompanySnapshot: company,
              customerEmailSnapshot: email,
              customerPhoneSnapshot: phone,
              customerPrimaryContactSnapshot: name,
            }
          : invoice
      )
    }

    return updated
  }

  updateDraft(id: string, payload: Partial<SaveInvoiceDraftRequest>) {
    const request = this.validateDraftRequest(payload)
    const current = this.getDraftInvoiceOrThrow(id)
    const customer = this.getCustomerOrThrow(request.customerId)

    const updated = buildInvoice(
      request,
      {
        customerCompanyAddressSnapshot: customer.address,
        customerCompanyName: customer.company,
        customerCompanySnapshot: customer.company,
        customerEmailSnapshot: customer.email,
        customerId: request.customerId,
        customerPhoneSnapshot: customer.phone,
        customerPrimaryContactSnapshot: customer.name,
        dueDate: request.dueDate,
        id: current.id,
        invoiceNumber: current.invoiceNumber,
        issueDate: request.issueDate,
        issuedCompanyAddress: current.issuedCompanyAddress,
        issuedCompanyName: current.issuedCompanyName,
        status: 'draft',
      },
      current.lines.map((line) => line.id)
    )

    this.replaceInvoice(updated)
    return updated
  }

  private getCustomerOrThrow(customerId: string) {
    const customer = this.customers.find((entry) => entry.id === customerId)
    if (!customer) {
      throw new Error('Customer not found.')
    }
    return customer
  }

  private getDraftInvoiceOrThrow(id: string) {
    const invoice = this.invoices.find((entry) => entry.id === id)
    if (!invoice) {
      throw new InvoiceNotFoundError('Invoice not found.')
    }
    if (invoice.status !== 'draft') {
      throw new Error('Only drafts can be edited or deleted.')
    }
    return invoice
  }

  private nextInvoiceNumber(issueDate: string) {
    const year = issueDate.slice(0, 4)
    const sequence =
      this.invoices.filter((invoice) => invoice.issueDate.startsWith(`${year}-`)).length + 1
    return `INV-${year}-${String(sequence).padStart(3, '0')}`
  }

  private replaceInvoice(updated: InvoiceResponse) {
    this.invoices = this.invoices.map((invoice) => (invoice.id === updated.id ? updated : invoice))
  }

  private validateDraftRequest(payload: Partial<SaveInvoiceDraftRequest>): SaveInvoiceDraftRequest {
    const customerId = payload.customerId?.trim() ?? ''
    const dueDate = payload.dueDate?.trim() ?? ''
    const issueDate = payload.issueDate?.trim() ?? ''
    const lines = Array.isArray(payload.lines) ? payload.lines : []
    const today = new Date().toISOString().slice(0, 10)

    if (!customerId) {
      throw new Error('Customer is required.')
    }
    if (!issueDate || !dueDate) {
      throw new Error('Issue date and due date are required.')
    }
    if (dueDate < issueDate) {
      throw new Error('Due date cannot be before the issue date.')
    }
    if (dueDate < today) {
      throw new Error('Due date must be today or later.')
    }
    if (lines.length === 0) {
      throw new Error('The invoice must contain at least one line.')
    }
    if (
      lines.some(
        (line) =>
          !line ||
          !line.description?.trim() ||
          Number(line.quantity) <= 0 ||
          Number(line.unitPrice) < 0 ||
          Number(line.vatRate) < 0
      )
    ) {
      throw new Error('Invoice lines are invalid.')
    }

    return {
      customerId,
      dueDate,
      issueDate,
      lines: lines.map((line) => ({
        description: line.description.trim(),
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        vatRate: Number(line.vatRate),
      })),
    }
  }
}

function buildInvoice(
  request: SaveInvoiceDraftRequest,
  meta: Pick<
    InvoiceResponse,
    | 'customerCompanyAddressSnapshot'
    | 'customerCompanyName'
    | 'customerCompanySnapshot'
    | 'customerEmailSnapshot'
    | 'customerId'
    | 'customerPhoneSnapshot'
    | 'customerPrimaryContactSnapshot'
    | 'dueDate'
    | 'id'
    | 'invoiceNumber'
    | 'issueDate'
    | 'issuedCompanyAddress'
    | 'issuedCompanyName'
    | 'status'
  >,
  existingLineIds?: string[]
) {
  const lines = request.lines.map((line, index) =>
    invoiceLineFromInput(line, existingLineIds?.[index] ?? `line-${crypto.randomUUID()}`)
  )

  const subtotalExclTax = roundCurrency(lines.reduce((sum, line) => sum + line.lineTotalExclTax, 0))
  const totalVat = roundCurrency(lines.reduce((sum, line) => sum + line.lineVatAmount, 0))
  const totalInclTax = roundCurrency(lines.reduce((sum, line) => sum + line.lineTotalInclTax, 0))

  return {
    ...meta,
    lines,
    subtotalExclTax,
    totalInclTax,
    totalVat,
  } satisfies InvoiceResponse
}

function invoiceLineFromInput(line: InvoiceLineRequest, id = `line-${crypto.randomUUID()}`) {
  const quantity = Number.isFinite(line.quantity) ? Number(line.quantity) : 0
  const unitPrice = Number.isFinite(line.unitPrice) ? Number(line.unitPrice) : 0
  const vatRate = Number.isFinite(line.vatRate) ? Number(line.vatRate) : 0
  const lineTotalExclTax = roundCurrency(quantity * unitPrice)
  const lineVatAmount = roundCurrency(lineTotalExclTax * (vatRate / 100))
  const lineTotalInclTax = roundCurrency(lineTotalExclTax + lineVatAmount)

  return {
    description: line.description.trim(),
    id,
    lineTotalExclTax,
    lineTotalInclTax,
    lineVatAmount,
    quantity,
    unitPrice,
    vatRate,
  } satisfies InvoiceLineResponse
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function sortDateDesc(left: string, right: string) {
  return right.localeCompare(left)
}

export const accountingStore = new MockAccountingStore()

import { DataTable } from '~/components/data_table'
import { StatusBadge } from '~/components/status_badge'
import { formatShortDate } from '~/lib/format'

import type { ActionTone, ProbeType, Props, WorkflowActionState } from './inspector_types'

import {
  DetailList,
  DetailRow,
  EmptyStateCopy,
  formatMoney,
  formatTimestamp,
} from './inspector_display_helpers'
import {
  buttonClass,
  CompactPanel,
  copyButtonClass,
  RuleList,
  ScrollableTable,
} from './inspector_ui_primitives'

export function WorkflowActionPanel({
  allowUnauthorizedMode,
  copyText,
  onRun,
  probeType,
  processingAction,
  record,
  selectedPermissions,
}: {
  allowUnauthorizedMode: boolean
  copyText: (value: string) => void
  onRun: (
    action: string,
    extra?: Record<string, string>,
    tone?: ActionTone,
    confirmMessage?: string
  ) => void
  probeType: ProbeType
  processingAction: null | string
  record:
    | null
    | Props['inspector']['customers'][number]
    | Props['inspector']['expenses'][number]
    | Props['inspector']['invoices'][number]
  selectedPermissions: Props['inspector']['context']['selectedMemberPermissions']
}) {
  if (!record) {
    return (
      <CompactPanel title="Record Actions">
        <EmptyStateCopy text="Select a record from the table to inspect it and run contextual actions." />
      </CompactPanel>
    )
  }

  const actions =
    probeType === 'invoices'
      ? invoiceActionStates(record as Props['inspector']['invoices'][number], selectedPermissions)
      : probeType === 'expenses'
        ? expenseActionStates(record as Props['inspector']['expenses'][number], selectedPermissions)
        : customerActionStates(
            (record as Props['inspector']['customers'][number]).id,
            selectedPermissions
          )

  return (
    <CompactPanel title="Record Actions">
      <div className="space-y-4">
        <DetailList>
          <DetailRow label="Entity" value={probeType.slice(0, -1)} />
          <DetailRow
            label="Record id"
            value={
              <div className="flex justify-end gap-2">
                <span className="font-mono text-xs">{record.id}</span>
                <button
                  className={copyButtonClass()}
                  onClick={() => copyText(record.id)}
                  type="button"
                >
                  Copy
                </button>
              </div>
            }
          />
          {'invoiceNumber' in record ? (
            <DetailRow label="Primary" value={record.invoiceNumber} />
          ) : null}
          {'label' in record ? <DetailRow label="Primary" value={record.label} /> : null}
          {'company' in record ? <DetailRow label="Primary" value={record.company} /> : null}
        </DetailList>

        <RuleList
          rules={actions.map((action) => ({
            allowed: action.allowed,
            label: action.label,
            reason: action.reason,
          }))}
          title="Action states"
        />

        <div className="space-y-2">
          {actions.map((action) => {
            const canAttempt =
              action.allowed || (allowUnauthorizedMode && action.attemptable !== false)
            return (
              <button
                className={`${buttonClass(action.tone)} w-full justify-between`}
                disabled={!canAttempt || processingAction === action.id}
                key={action.label}
                onClick={() =>
                  onRun(
                    action.id,
                    action.extra,
                    action.tone,
                    action.tone === 'danger' ? `${action.label}?` : undefined
                  )
                }
                type="button"
              >
                <span>{processingAction === action.id ? 'Running...' : action.label}</span>
                <span className="text-xs opacity-80">
                  {action.allowed ? 'allowed' : allowUnauthorizedMode ? 'attempt' : 'blocked'}
                </span>
              </button>
            )
          })}
        </div>

        {!allowUnauthorizedMode ? (
          <div className="rounded-xl border border-outline-variant/12 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface-variant">
            Enable unauthorized mode to deliberately trigger blocked paths and verify denials.
          </div>
        ) : null}
      </div>
    </CompactPanel>
  )
}

export function WorkflowRecordTable({
  customers,
  expenses,
  invoices,
  onSelectRecord,
  probeType,
  selectedCustomer,
  selectedExpense,
  selectedInvoice,
}: {
  customers: Props['inspector']['customers']
  expenses: Props['inspector']['expenses']
  invoices: Props['inspector']['invoices']
  onSelectRecord: (recordId: string) => void
  probeType: ProbeType
  selectedCustomer: null | Props['inspector']['customers'][number]
  selectedExpense: null | Props['inspector']['expenses'][number]
  selectedInvoice: null | Props['inspector']['invoices'][number]
}) {
  const title =
    probeType === 'invoices' ? 'Invoices' : probeType === 'expenses' ? 'Expenses' : 'Customers'

  return (
    <DataTable
      emptyMessage={`No ${title.toLowerCase()} available in the selected tenant.`}
      isEmpty={
        probeType === 'invoices'
          ? invoices.length === 0
          : probeType === 'expenses'
            ? expenses.length === 0
            : customers.length === 0
      }
      title={title}
    >
      <ScrollableTable maxHeightClass="max-h-[42rem]">
        {probeType === 'invoices' ? (
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-outline-variant/12 bg-surface-container-low text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Window</th>
                <th className="px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice, index) => (
                <tr
                  className={`cursor-pointer border-b border-outline-variant/8 transition-colors hover:bg-surface-container-low/75 ${
                    selectedInvoice?.id === invoice.id
                      ? 'bg-primary/6'
                      : index % 2 === 0
                        ? 'bg-surface-container-lowest'
                        : 'bg-surface-container-lowest/70'
                  }`}
                  key={invoice.id}
                  onClick={() => onSelectRecord(invoice.id)}
                >
                  <td className="px-3 py-2.5 font-medium text-on-surface">
                    {invoice.invoiceNumber}
                  </td>
                  <td className="px-3 py-2.5 text-on-surface-variant">
                    {invoice.customerCompanyName}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td className="px-3 py-2.5 text-on-surface-variant">
                    {formatShortDate(invoice.issueDate)} to {formatShortDate(invoice.dueDate)}
                  </td>
                  <td className="px-3 py-2.5 text-on-surface">
                    {formatMoney(invoice.totalInclTaxCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {probeType === 'expenses' ? (
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-outline-variant/12 bg-surface-container-low text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                <th className="px-3 py-2">Expense</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense, index) => (
                <tr
                  className={`cursor-pointer border-b border-outline-variant/8 transition-colors hover:bg-surface-container-low/75 ${
                    selectedExpense?.id === expense.id
                      ? 'bg-primary/6'
                      : index % 2 === 0
                        ? 'bg-surface-container-lowest'
                        : 'bg-surface-container-lowest/70'
                  }`}
                  key={expense.id}
                  onClick={() => onSelectRecord(expense.id)}
                >
                  <td className="px-3 py-2.5 font-medium text-on-surface">{expense.label}</td>
                  <td className="px-3 py-2.5 text-on-surface-variant">{expense.category}</td>
                  <td className="px-3 py-2.5 text-on-surface-variant">
                    {formatShortDate(expense.date)}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={expense.status} />
                  </td>
                  <td className="px-3 py-2.5 text-on-surface">
                    {formatMoney(expense.amountCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {probeType === 'customers' ? (
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-outline-variant/12 bg-surface-container-low text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer, index) => (
                <tr
                  className={`cursor-pointer border-b border-outline-variant/8 transition-colors hover:bg-surface-container-low/75 ${
                    selectedCustomer?.id === customer.id
                      ? 'bg-primary/6'
                      : index % 2 === 0
                        ? 'bg-surface-container-lowest'
                        : 'bg-surface-container-lowest/70'
                  }`}
                  key={customer.id}
                  onClick={() => onSelectRecord(customer.id)}
                >
                  <td className="px-3 py-2.5 font-medium text-on-surface">{customer.company}</td>
                  <td className="px-3 py-2.5 text-on-surface-variant">{customer.name}</td>
                  <td className="px-3 py-2.5 text-on-surface-variant">{customer.email}</td>
                  <td className="px-3 py-2.5 text-on-surface-variant">{customer.phone}</td>
                  <td className="px-3 py-2.5 text-on-surface-variant">
                    {formatTimestamp(customer.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </ScrollableTable>
    </DataTable>
  )
}

function customerActionStates(
  customerId: string,
  permissions: Props['inspector']['context']['selectedMemberPermissions']
): WorkflowActionState[] {
  return [
    {
      allowed: permissions.accountingWriteDrafts,
      extra: { customerId },
      id: 'update-customer',
      label: 'Update customer',
      reason: permissions.accountingWriteDrafts
        ? 'Draft write permission available.'
        : 'Draft write permission is missing.',
      tone: 'secondary',
    },
    {
      allowed: permissions.accountingWriteDrafts,
      extra: { customerId },
      id: 'delete-customer',
      label: 'Delete customer',
      reason: permissions.accountingWriteDrafts
        ? 'Delete path available unless invoices are linked.'
        : 'Draft write permission is missing.',
      tone: 'danger',
    },
  ]
}

function expenseActionStates(
  expense: Props['inspector']['expenses'][number],
  permissions: Props['inspector']['context']['selectedMemberPermissions']
): WorkflowActionState[] {
  return [
    {
      allowed: permissions.accountingWriteDrafts && expense.status === 'draft',
      extra: { expenseId: expense.id },
      id: 'confirm-expense',
      label: 'Confirm expense',
      reason:
        expense.status !== 'draft'
          ? 'Only draft expenses can be confirmed.'
          : permissions.accountingWriteDrafts
            ? 'Draft write permission available.'
            : 'Draft write permission is missing.',
      tone: 'primary',
    },
    {
      allowed: permissions.accountingWriteDrafts && expense.status === 'draft',
      extra: { expenseId: expense.id },
      id: 'delete-expense',
      label: 'Delete draft expense',
      reason:
        expense.status !== 'draft'
          ? 'Only draft expenses can be deleted.'
          : permissions.accountingWriteDrafts
            ? 'Draft delete path is available.'
            : 'Draft write permission is missing.',
      tone: 'danger',
    },
    {
      allowed: permissions.accountingWriteDrafts && expense.status === 'confirmed',
      extra: { expenseId: expense.id },
      id: 'delete-confirmed-expense',
      label: 'Delete confirmed expense',
      reason:
        expense.status !== 'confirmed'
          ? 'Select a confirmed expense to exercise the blocked path.'
          : permissions.accountingWriteDrafts
            ? 'Visible blocked path for confirmed delete checks.'
            : 'Draft write permission is missing.',
      tone: 'danger',
    },
  ]
}

function invoiceActionStates(
  invoice: Props['inspector']['invoices'][number],
  permissions: Props['inspector']['context']['selectedMemberPermissions']
): WorkflowActionState[] {
  return [
    {
      allowed: permissions.accountingWriteDrafts && invoice.status === 'draft',
      extra: { invoiceId: invoice.id },
      id: 'update-invoice-draft',
      label: 'Update draft',
      reason:
        invoice.status !== 'draft'
          ? 'Only draft invoices can be edited.'
          : permissions.accountingWriteDrafts
            ? 'Draft write permission available.'
            : 'Draft write permission is missing.',
      tone: 'secondary',
    },
    {
      allowed: permissions.invoiceIssue && invoice.status === 'draft',
      extra: { invoiceId: invoice.id },
      id: 'change-invoice-status',
      label: 'Send invoice',
      reason:
        invoice.status !== 'draft'
          ? 'Only draft invoices can be issued.'
          : permissions.invoiceIssue
            ? 'Issue permission available.'
            : 'Issue permission is missing.',
      tone: 'primary',
    },
    {
      allowed: permissions.invoiceMarkPaid && invoice.status === 'issued',
      extra: { invoiceId: invoice.id },
      id: 'change-invoice-status',
      label: 'Mark paid',
      reason:
        invoice.status !== 'issued'
          ? 'Only issued invoices can be marked as paid.'
          : permissions.invoiceMarkPaid
            ? 'Mark-paid permission available.'
            : 'Mark-paid permission is missing.',
      tone: 'primary',
    },
    {
      allowed: permissions.accountingWriteDrafts && invoice.status === 'draft',
      extra: { invoiceId: invoice.id },
      id: 'delete-invoice',
      label: 'Delete draft',
      reason:
        invoice.status !== 'draft'
          ? 'Only draft invoices can be deleted.'
          : permissions.accountingWriteDrafts
            ? 'Draft deletion path is available.'
            : 'Draft write permission is missing.',
      tone: 'danger',
    },
    {
      allowed: false,
      attemptable: invoice.status !== 'draft',
      extra: { invoiceId: invoice.id },
      id: 'delete-invoice',
      label: 'Delete sent invoice',
      reason:
        invoice.status === 'draft'
          ? 'Select a non-draft invoice to exercise the blocked path.'
          : 'Visible blocked path for forbidden deletion checks.',
      tone: 'danger',
    },
  ]
}

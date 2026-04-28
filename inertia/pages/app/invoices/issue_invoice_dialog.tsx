export function IssueInvoiceDialog({
  isOpen,
  issueForm,
  onCancel,
  onConfirm,
  onFieldChange,
  readOnly,
  saving,
}: {
  isOpen: boolean
  issueForm: { issuedCompanyAddress: string; issuedCompanyName: string }
  onCancel: () => void
  onConfirm: () => void
  onFieldChange: (field: 'issuedCompanyAddress' | 'issuedCompanyName', value: string) => void
  readOnly: boolean
  saving: boolean
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-[2px]">
      <div
        className="w-full max-w-xl rounded-2xl border border-slate-200/95 bg-white p-6 shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/[0.06] sm:p-8"
        role="dialog"
      >
        <h3 className="font-headline text-lg font-bold tracking-tight text-slate-950">Issue invoice</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          Provide company identity to snapshot this issued invoice.
        </p>
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="form-label-caps">Company name</span>
            <input
              className="mt-2 h-10 min-h-10 w-full rounded-xl border border-border-default bg-white px-3 text-sm text-on-surface shadow-sm outline-hidden ring-1 ring-slate-900/[0.05] transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20"
              disabled={readOnly}
              onChange={(event) => onFieldChange('issuedCompanyName', event.target.value)}
              required
              value={issueForm.issuedCompanyName}
            />
          </label>
          <label className="block">
            <span className="form-label-caps">Company address</span>
            <textarea
              className="mt-2 min-h-28 w-full rounded-xl border border-border-default bg-white px-3 py-2.5 text-sm text-on-surface shadow-sm outline-hidden ring-1 ring-slate-900/[0.05] transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20"
              disabled={readOnly}
              onChange={(event) => onFieldChange('issuedCompanyAddress', event.target.value)}
              required
              value={issueForm.issuedCompanyAddress}
            />
          </label>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200/80 pt-6">
          <button
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors duration-150 hover:bg-slate-50"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-md shadow-primary/25 transition-colors duration-150 hover:bg-primary-dim disabled:opacity-60"
            disabled={
              readOnly ||
              saving ||
              !issueForm.issuedCompanyName.trim() ||
              !issueForm.issuedCompanyAddress.trim()
            }
            onClick={onConfirm}
            type="button"
          >
            {saving ? 'Issuing…' : 'Confirm issue'}
          </button>
        </div>
      </div>
    </div>
  )
}

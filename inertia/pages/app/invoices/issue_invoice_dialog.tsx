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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-outline-variant/20 bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-on-surface">Issue invoice</h3>
        <p className="mt-1 text-sm text-on-surface-variant">
          Provide company identity to snapshot this issued invoice.
        </p>
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-on-surface">Company name</span>
            <input
              className="mt-1 w-full rounded-lg border border-outline-variant/35 px-3 py-2 text-sm"
              disabled={readOnly}
              onChange={(event) => onFieldChange('issuedCompanyName', event.target.value)}
              required
              value={issueForm.issuedCompanyName}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-on-surface">Company address</span>
            <textarea
              className="mt-1 min-h-28 w-full rounded-lg border border-outline-variant/35 px-3 py-2 text-sm"
              disabled={readOnly}
              onChange={(event) => onFieldChange('issuedCompanyAddress', event.target.value)}
              required
              value={issueForm.issuedCompanyAddress}
            />
          </label>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            className="rounded-lg border border-outline-variant/35 px-4 py-2 text-sm"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-lg px-4 py-2 text-sm font-medium text-on-primary milled-steel-gradient disabled:opacity-60"
            disabled={
              readOnly ||
              saving ||
              !issueForm.issuedCompanyName.trim() ||
              !issueForm.issuedCompanyAddress.trim()
            }
            onClick={onConfirm}
            type="button"
          >
            Confirm issue
          </button>
        </div>
      </div>
    </div>
  )
}

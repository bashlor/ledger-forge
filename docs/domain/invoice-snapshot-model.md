# Invoice Snapshot Model

[Documentation index](../README.md)

Invoices keep customer and company fields because an issued invoice is a historical document,
not just a live join to `customers`.

Canonical meaning of invoice customer/company fields:

- `customerCompanyName`: current company display name used while invoice is draft/listed.
- `customerCompanySnapshot`: frozen company name snapshot copied from customer data.
- `customerCompanyAddressSnapshot`: frozen company address snapshot copied from customer data.
- `issuedCompanyName`: explicit company name entered at issue time (authoritative for issued document).
- `issuedCompanyAddress`: explicit company address entered at issue time (authoritative for issued document).
- `customerEmailSnapshot` / `customerPrimaryContactSnapshot`: optional customer contact snapshots.

Legacy compatibility:

- `customerName` is kept in database for transition compatibility and historical rows.
- New frontend code should not rely on `customerName`.

Domain rule:

- draft invoices may refresh their customer snapshot from live customer data.
- issued invoices preserve the snapshot that explains the document at issue time.
- later customer updates must not rewrite issued invoice history.

Related docs: [Invoice lifecycle](invoice-lifecycle.md), [ADR-008: Invoice Snapshot And Lifecycle](../adr/ADR-008-invoice-snapshot-and-lifecycle.md).

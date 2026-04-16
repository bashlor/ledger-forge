# Invoice Snapshot Model

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

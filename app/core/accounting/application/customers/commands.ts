import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { customers, invoices } from '#core/accounting/drizzle/schema'
import { and, eq, sql } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

import type { CustomerRow, NormalizedCustomerInput } from './types.js'

type DrizzleDb = PostgresJsDatabase<any>
type DrizzleTx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0]

export async function deleteCustomerIfUnlinked(
  tx: DrizzleTx,
  id: string,
  organizationId: string
): Promise<undefined | { id: string }> {
  const [deleted] = await tx
    .delete(customers)
    .where(
      and(
        eq(customers.id, id),
        eq(customers.organizationId, organizationId),
        sql`not exists (
          select 1
          from ${invoices}
          where ${invoices.customerId} = ${customers.id}
        )`
      )
    )
    .returning({ id: customers.id })

  return deleted
}

export async function insertCustomer(
  db: DrizzleDb,
  input: NormalizedCustomerInput,
  actor: { createdBy: null | string; organizationId: string }
): Promise<CustomerRow> {
  const [row] = await db
    .insert(customers)
    .values({
      address: input.address,
      company: input.company,
      createdBy: actor.createdBy,
      email: input.email,
      id: uuidv7(),
      name: input.name,
      note: input.note,
      organizationId: actor.organizationId,
      phone: input.phone,
    })
    .returning()

  return row
}

export async function syncDraftInvoiceCustomerSnapshots(
  tx: DrizzleTx,
  customerId: string,
  input: NormalizedCustomerInput,
  organizationId: string
): Promise<void> {
  await tx
    .update(invoices)
    .set({
      customerCompanyAddressSnapshot: input.address,
      customerCompanyName: input.company,
      customerCompanySnapshot: input.company,
      customerEmailSnapshot: input.email,
      customerPhoneSnapshot: input.phone,
      customerPrimaryContactSnapshot: input.name,
    })
    .where(
      and(
        eq(invoices.customerId, customerId),
        eq(invoices.status, 'draft'),
        eq(invoices.organizationId, organizationId)
      )
    )
}

export async function updateCustomerById(
  tx: DrizzleTx,
  id: string,
  input: NormalizedCustomerInput,
  organizationId: string
): Promise<CustomerRow | undefined> {
  const [updated] = await tx
    .update(customers)
    .set({
      address: input.address,
      company: input.company,
      email: input.email,
      name: input.name,
      note: input.note,
      phone: input.phone,
    })
    .where(and(eq(customers.id, id), eq(customers.organizationId, organizationId)))
    .returning()
  return updated
}

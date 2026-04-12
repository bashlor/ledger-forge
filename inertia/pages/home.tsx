export default function Home() {
  return (
    <main className="min-h-dvh bg-background px-6 py-12">
      <div className="mx-auto max-w-5xl space-y-10">
        <section className="rounded-2xl bg-surface-container-lowest p-8 shadow-card md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-dim">
            Accounting Demo
          </p>
          <h1 className="mt-4 max-w-2xl font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            Backend-first accounting workflow with a simple operational UI.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-on-surface-variant">
            This demo keeps the frontend intentionally lean so the business rules, auth flow, and
            backend structure stay easy to read during an interview.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <a
            className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-card-sm transition-colors hover:bg-surface-container-low"
            href="/dashboard"
          >
            <h2 className="font-headline text-lg font-bold text-on-surface">Dashboard</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Review revenue, expenses, and profit generated from the mocked accounting backend.
            </p>
          </a>

          <a
            className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-card-sm transition-colors hover:bg-surface-container-low"
            href="/customers"
          >
            <h2 className="font-headline text-lg font-bold text-on-surface">Customers</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Manage the customer directory used by invoices and guarded deletion rules.
            </p>
          </a>

          <a
            className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-card-sm transition-colors hover:bg-surface-container-low"
            href="/invoices"
          >
            <h2 className="font-headline text-lg font-bold text-on-surface">Invoices</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Create drafts, issue invoices, and move them through the allowed transitions.
            </p>
          </a>
        </section>
      </div>
    </main>
  )
}

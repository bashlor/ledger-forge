import { Form, Link } from '@adonisjs/inertia/react'
import { Head } from '@inertiajs/react'

import { PageHeader } from '~/components/page_header'

import type { FormErrors, InertiaProps } from '../../types'

type Props = InertiaProps<{
  bootstrap: {
    currentUser: null | {
      email: string
      fullName: null | string
    }
    defaults: {
      email: string
      fullName: string
      password: string
    }
  }
}>

export default function DevAccessPage({ bootstrap }: Props) {
  return (
    <>
      <Head title="Dev tools access" />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10">
        <PageHeader
          description="Development-only bootstrap page for a local dev operator. It can create the account if it does not exist yet, then grant access to the Dev Inspector."
          eyebrow="Development"
          title="Dev Tools Access"
        />

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-ambient-tight">
            <h2 className="text-base font-semibold text-on-surface">Bootstrap local access</h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Submit the credentials below to sign in an existing local account or create it on the
              fly. The resulting account is then granted dev operator access in the local database.
            </p>

            <Form className="mt-6 space-y-5" route="dev.access.store">
              {({ errors }: { errors: FormErrors }) => {
                return (
                  <>
                    <label className="block space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                        Full name
                      </span>
                      <input
                        className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30"
                        defaultValue={bootstrap.defaults.fullName}
                        name="fullName"
                        placeholder="Dev Operator"
                      />
                      {errors.fullName ? <p className="text-sm text-error">{errors.fullName}</p> : null}
                    </label>

                    <label className="block space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                        Email
                      </span>
                      <input
                        autoComplete="username"
                        className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30"
                        defaultValue={bootstrap.defaults.email}
                        name="email"
                        placeholder="dev-operator@example.local"
                        required
                        type="email"
                      />
                      {errors.email ? <p className="text-sm text-error">{errors.email}</p> : null}
                    </label>

                    <label className="block space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                        Password
                      </span>
                      <input
                        autoComplete="new-password"
                        className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30"
                        defaultValue={bootstrap.defaults.password}
                        name="password"
                        required
                        type="password"
                      />
                      {errors.password ? <p className="text-sm text-error">{errors.password}</p> : null}
                    </label>

                    <label className="block space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                        Confirm password
                      </span>
                      <input
                        autoComplete="new-password"
                        className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30"
                        defaultValue={bootstrap.defaults.password}
                        name="passwordConfirmation"
                        required
                        type="password"
                      />
                    </label>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-on-primary milled-steel-gradient"
                        type="submit"
                      >
                        Provision dev operator
                      </button>
                      <Link
                        className="inline-flex items-center justify-center rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface"
                        href="/signin"
                      >
                        Open standard sign-in
                      </Link>
                    </div>
                  </>
                )
              }}
            </Form>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-ambient-tight">
              <h2 className="text-base font-semibold text-on-surface">Current session</h2>
              {bootstrap.currentUser ? (
                <div className="mt-4 space-y-2 text-sm text-on-surface-variant">
                  <p>
                    Signed in as <span className="font-semibold text-on-surface">{bootstrap.currentUser.fullName ?? bootstrap.currentUser.email}</span>
                  </p>
                  <p>{bootstrap.currentUser.email}</p>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-on-surface-variant">
                  No active session was detected. Submitting the form will create or sign in the
                  local dev operator and redirect directly to the Dev Inspector.
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-ambient-tight">
              <h2 className="text-base font-semibold text-on-surface">How it works</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-on-surface-variant">
                <li>The page is available only when development tools are enabled.</li>
                <li>The account is created if the email does not exist yet, otherwise it is signed in.</li>
                <li>The database stores a local dev operator grant so the Dev Inspector can be reopened later.</li>
              </ul>
            </section>
          </div>
        </section>
      </div>
    </>
  )
}
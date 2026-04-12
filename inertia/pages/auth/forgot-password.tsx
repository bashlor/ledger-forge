import { Form, Link } from '@adonisjs/inertia/react'
import { Head } from '@inertiajs/react'

import type { FormErrors } from '~/types'

export default function ForgotPassword() {
  return (
    <>
      <Head title="Forgot password" />

      <main className="relative flex min-h-0 flex-1 flex-col bg-background px-6 py-12">
        <div className="pointer-events-none fixed right-0 top-0 -z-10 h-[40vw] w-[40vw] translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-container/20 blur-[120px]" />

        <div className="mx-auto w-full max-w-[440px]">
          <div className="relative overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-8 shadow-ambient">
            <div className="absolute left-0 top-0 h-1 w-full milled-steel-gradient opacity-80" />
            <h1 className="font-headline text-xl font-bold text-on-surface">Forgot password</h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              Enter your email and we&apos;ll send you a reset link
            </p>

            <Form action="/forgot-password" className="mt-8 space-y-6" method="post">
              {({ errors }: { errors: FormErrors }) => (
                <>
                  <div className="space-y-2">
                    <label
                      className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
                      htmlFor="email"
                    >
                      Email
                    </label>
                    <input
                      autoComplete="email"
                      className="w-full rounded-xl border border-outline-variant/35 bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
                      data-invalid={errors.email ? 'true' : undefined}
                      id="email"
                      name="email"
                      type="email"
                    />
                    {errors.email ? (
                      <p className="text-sm font-medium text-error">{errors.email}</p>
                    ) : null}
                  </div>

                  <button
                    className="w-full rounded-lg py-3 font-headline text-sm font-bold text-on-primary milled-steel-gradient transition-all hover:opacity-95"
                    type="submit"
                  >
                    Send reset link
                  </button>

                  <p className="text-center text-sm text-on-surface-variant">
                    <Link
                      className="font-semibold text-primary hover:text-primary-dim"
                      href="/signin"
                    >
                      Back to login
                    </Link>
                  </p>
                </>
              )}
            </Form>
          </div>
        </div>
      </main>
    </>
  )
}

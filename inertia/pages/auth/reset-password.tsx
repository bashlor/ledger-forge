import { Form } from '@adonisjs/inertia/react'
import { Head } from '@inertiajs/react'

import type { FormErrors, InertiaProps } from '~/types'

export default function ResetPassword({ token }: InertiaProps<{ token: string }>) {
  return (
    <>
      <Head title="Reset password" />

      <main className="relative flex min-h-0 flex-1 flex-col bg-background px-6 py-12">
        <div className="pointer-events-none fixed right-0 top-0 -z-10 h-[40vw] w-[40vw] translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-container/20 blur-[120px]" />

        <div className="mx-auto w-full max-w-[440px]">
          <div className="relative overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-8 shadow-ambient">
            <div className="absolute left-0 top-0 h-1 w-full milled-steel-gradient opacity-80" />
            <h1 className="font-headline text-xl font-bold text-on-surface">Reset password</h1>
            <p className="mt-2 text-sm text-on-surface-variant">Enter your new password below</p>

            <Form action="/reset-password" className="mt-8 space-y-6" method="post">
              {({ errors }: { errors: FormErrors }) => (
                <>
                  <input name="token" type="hidden" value={token} />

                  <div className="space-y-2">
                    <label
                      className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
                      htmlFor="newPassword"
                    >
                      New password
                    </label>
                    <input
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-outline-variant/35 bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
                      data-invalid={errors.newPassword ? 'true' : undefined}
                      id="newPassword"
                      name="newPassword"
                      type="password"
                    />
                    {errors.newPassword ? (
                      <p className="text-sm font-medium text-error">{errors.newPassword}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <label
                      className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
                      htmlFor="newPasswordConfirmation"
                    >
                      Confirm new password
                    </label>
                    <input
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-outline-variant/35 bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
                      data-invalid={errors.newPasswordConfirmation ? 'true' : undefined}
                      id="newPasswordConfirmation"
                      name="newPasswordConfirmation"
                      type="password"
                    />
                    {errors.newPasswordConfirmation ? (
                      <p className="text-sm font-medium text-error">
                        {errors.newPasswordConfirmation}
                      </p>
                    ) : null}
                  </div>

                  <button
                    className="w-full rounded-lg py-3 font-headline text-sm font-bold text-on-primary milled-steel-gradient transition-all hover:opacity-95"
                    type="submit"
                  >
                    Reset password
                  </button>
                </>
              )}
            </Form>
          </div>
        </div>
      </main>
    </>
  )
}

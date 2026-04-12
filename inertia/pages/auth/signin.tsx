import { Form, Link } from '@adonisjs/inertia/react'
import { Head } from '@inertiajs/react'

import type { FormErrors } from '~/types'

import { AppIcon } from '~/components/app_icon'

export default function Signin() {
  return (
    <>
      <Head title="Secure access" />

      <main className="relative flex min-h-0 flex-1 flex-col bg-background px-6 py-12 text-on-background selection:bg-primary-container selection:text-on-primary-container">
        <div className="pointer-events-none fixed right-0 top-0 -z-10 h-[40vw] w-[40vw] translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-container/20 blur-[120px]" />
        <div className="pointer-events-none fixed bottom-0 left-0 -z-10 h-[30vw] w-[30vw] -translate-x-1/2 translate-y-1/2 rounded-full bg-tertiary-container/10 blur-[100px]" />

        <div className="mx-auto flex w-full max-w-[440px] flex-grow flex-col items-center justify-center">
          <div className="relative w-full overflow-hidden rounded-xl bg-surface-container-lowest p-8 shadow-ambient md:p-10">
            <div className="absolute left-0 top-0 h-1 w-full milled-steel-gradient opacity-80" />
            <header className="mb-8">
              <h2 className="font-headline text-xl font-bold text-on-surface">Secure access</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Use the credentials you created during signup to open the workspace.
              </p>
            </header>

            <Form route="signin.store">
              {({ errors }: { errors: FormErrors }) => {
                return (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label
                        className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
                        htmlFor="email"
                      >
                        Email address
                      </label>
                      <div className="group relative">
                        <input
                          autoComplete="username"
                          className="w-full border-0 bg-surface-container-lowest py-3 pl-0 pr-0 font-medium text-on-surface shadow-none outline-hidden ring-0 transition-all placeholder:text-outline/40 focus:border-primary focus:ring-0 ghost-border"
                          id="email"
                          name="email"
                          placeholder="name@organization.com"
                          required
                          type="email"
                        />
                        <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-focus-within:w-full" />
                      </div>
                      {errors.email ? (
                        <p className="text-sm font-medium text-error">{errors.email}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-end justify-between gap-2">
                        <label
                          className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
                          htmlFor="password"
                        >
                          Password
                        </label>
                        <Link
                          className="text-xs font-semibold text-primary transition-colors hover:text-primary-dim"
                          href="/forgot-password"
                        >
                          Forgot access?
                        </Link>
                      </div>
                      <div className="group relative">
                        <input
                          autoComplete="current-password"
                          className="w-full border-0 bg-surface-container-lowest py-3 pl-0 pr-0 font-medium text-on-surface shadow-none outline-hidden ring-0 transition-all placeholder:text-outline/40 focus:border-primary focus:ring-0 ghost-border"
                          id="password"
                          name="password"
                          placeholder="••••••••••••"
                          required
                          type="password"
                        />
                        <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-focus-within:w-full" />
                      </div>
                      {errors.password ? (
                        <p className="text-sm font-medium text-error">{errors.password}</p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3 rounded-lg border border-outline-variant/10 bg-surface-container-low p-3">
                      <AppIcon className="text-secondary" filled name="shield_lock" size={18} />
                      <p className="text-[11px] font-medium leading-tight text-on-surface-variant">
                        Enter your signup email and password. If sign-in fails, check the red hint
                        under the password field and the toast summary.
                      </p>
                    </div>

                    <button
                      className="w-full rounded-lg py-4 font-headline text-sm font-bold uppercase tracking-widest text-on-primary shadow-md milled-steel-gradient transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-60"
                      type="submit"
                    >
                      Authorize access
                    </button>

                    <div className="flex items-center justify-center gap-2 text-sm text-on-surface-variant">
                      <span>No account yet?</span>
                      <Link
                        className="font-semibold text-primary transition-colors hover:text-primary-dim"
                        href="/signup"
                      >
                        Create one
                      </Link>
                    </div>
                  </div>
                )
              }}
            </Form>

            <footer className="ghost-border mt-10 pt-6 text-center">
              <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-outline">
                <span className="transition-colors hover:text-on-surface">Privacy</span>
                <span className="h-1 w-1 rounded-full bg-outline-variant" />
                <span className="transition-colors hover:text-on-surface">Security</span>
                <span className="h-1 w-1 rounded-full bg-outline-variant" />
                <span className="transition-colors hover:text-on-surface">Compliance</span>
              </div>
            </footer>
          </div>
        </div>
      </main>
    </>
  )
}

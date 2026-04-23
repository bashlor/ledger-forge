import { Form, Link } from '@adonisjs/inertia/react'
import { Head } from '@inertiajs/react'

import type { FormErrors } from '~/types'

import { AppIcon } from '~/components/app_icon'
import { PrimaryButton } from '~/components/button'
import { FormField } from '~/components/form_field'

export default function Signup() {
  return (
    <>
      <Head title="Create account" />

      <main className="relative flex min-h-0 flex-1 flex-col bg-background px-6 py-12 text-on-background selection:bg-primary-container selection:text-on-primary-container">
        <div className="pointer-events-none fixed right-0 top-0 -z-10 h-[40vw] w-[40vw] translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-container/20 blur-[120px]" />
        <div className="pointer-events-none fixed bottom-0 left-0 -z-10 h-[30vw] w-[30vw] -translate-x-1/2 translate-y-1/2 rounded-full bg-tertiary-container/10 blur-[100px]" />

        <div className="mx-auto flex w-full max-w-[440px] flex-grow flex-col items-center justify-center">
          <div className="relative w-full overflow-hidden rounded-xl bg-surface-container-lowest p-8 shadow-ambient md:p-10">
            <div className="absolute left-0 top-0 h-1 w-full milled-steel-gradient opacity-80" />
            <header className="mb-8">
              <h2 className="font-headline text-xl font-bold text-on-surface">Create account</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Set your profile details and get redirected into the workspace immediately.
              </p>
            </header>

            <Form route="signup.store">
              {({ errors }: { errors: FormErrors }) => (
                <div className="space-y-6">
                  <FormField
                    autoComplete="name"
                    error={errors.fullName}
                    id="fullName"
                    label="Full name"
                    required
                    variant="ghost"
                  />
                  <FormField
                    autoComplete="email"
                    error={errors.email}
                    id="email"
                    label="Email address"
                    required
                    type="email"
                    variant="ghost"
                  />
                  <FormField
                    autoComplete="new-password"
                    error={errors.password}
                    id="password"
                    label="Password"
                    required
                    type="password"
                    variant="ghost"
                  />
                  <FormField
                    autoComplete="new-password"
                    error={errors.passwordConfirmation}
                    id="passwordConfirmation"
                    label="Confirm password"
                    required
                    type="password"
                    variant="ghost"
                  />

                  <div className="flex items-center gap-3 rounded-lg border border-outline-variant/10 bg-surface-container-low p-3">
                    <AppIcon className="text-secondary" filled name="verified_user" size={18} />
                    <p className="text-[11px] font-medium leading-tight text-on-surface-variant">
                      This uses the built-in Better Auth flow from the boilerplate, so signup and
                      initial session creation stay wired to the backend.
                    </p>
                  </div>

                  <PrimaryButton
                    className="w-full py-4 font-headline font-bold uppercase tracking-widest"
                    type="submit"
                  >
                    Create workspace access
                  </PrimaryButton>

                  <div className="flex items-center justify-center gap-2 text-sm text-on-surface-variant">
                    <span>Already have an account?</span>
                    <Link
                      className="font-semibold text-primary transition-colors hover:text-primary-dim"
                      href="/signin"
                    >
                      Sign in
                    </Link>
                  </div>
                </div>
              )}
            </Form>

            <footer className="ghost-border mt-10 pt-6 text-center">
              <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-outline">
                <span className="transition-colors hover:text-on-surface">Identity</span>
                <span className="h-1 w-1 rounded-full bg-outline-variant" />
                <span className="transition-colors hover:text-on-surface">Session</span>
                <span className="h-1 w-1 rounded-full bg-outline-variant" />
                <span className="transition-colors hover:text-on-surface">Redirect</span>
              </div>
            </footer>
          </div>
        </div>
      </main>
    </>
  )
}

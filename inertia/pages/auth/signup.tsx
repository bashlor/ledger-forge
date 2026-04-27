import { Form, Link } from '@adonisjs/inertia/react'
import { Head } from '@inertiajs/react'

import type { FormErrors } from '~/types'

import { AppIcon } from '~/components/app_icon'
import { AuthPageShell } from '~/components/auth_page_shell'
import { PrimaryButton } from '~/components/button'
import { FormField } from '~/components/form_field'

export default function Signup() {
  return (
    <>
      <Head title="Create account" />

      <AuthPageShell
        description="Set your profile details and get redirected into the workspace immediately."
        title="Create account"
      >
        <Form route="signup.store">
          {({ errors }: { errors: FormErrors }) => (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-outline-variant/10 bg-surface-container-low p-2.5">
                <AppIcon className="text-secondary" filled name="verified_user" size={18} />
                <p className="text-[11px] font-medium leading-tight text-on-surface-variant">
                  This uses the built-in Better Auth flow from the boilerplate, so signup and
                  initial session creation stay wired to the backend.
                </p>
              </div>

              <PrimaryButton
                className="w-full py-3 font-headline font-bold uppercase tracking-widest"
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
      </AuthPageShell>
    </>
  )
}

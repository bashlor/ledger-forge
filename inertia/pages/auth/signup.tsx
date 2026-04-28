import { Form, Link } from '@adonisjs/inertia/react'
import { Head } from '@inertiajs/react'

import type { FormErrors } from '~/types'

import { AppIcon } from '~/components/app_icon'
import { AuthCallout } from '~/components/auth_callout'
import { AuthMarketingAside } from '~/components/auth_marketing_aside'
import { AuthPageShell } from '~/components/auth_page_shell'
import { PrimaryButton } from '~/components/button'
import { FormField } from '~/components/form_field'

const signupAside = (
  <AuthMarketingAside
    description="Provision a workspace in one step—then explore invoicing, expenses, and reporting with realistic constraints."
    eyebrow="Ledger Forge"
    headline="Start in a real workspace"
    points={[
      {
        icon: 'person_add',
        text: 'Your profile becomes the owner of a dedicated demo workspace with sane defaults.',
      },
      {
        icon: 'payments',
        text: 'Core accounting paths stay wired through the same API and validation as the rest of the app.',
      },
      {
        icon: 'verified_user',
        text: 'Passwords and sessions follow standard secure auth—suitable for stakeholder walkthroughs.',
      },
    ]}
  />
)

export default function Signup() {
  return (
    <>
      <Head title="Create account" />

      <AuthPageShell
        aside={signupAside}
        description="Add your name and credentials. After registration completes, you will land in your workspace."
        title="Create account"
        wideForm
      >
        <Form route="signup.store">
          {({ errors }: { errors: FormErrors }) => (
            <div className="space-y-5 sm:space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                <FormField
                  autoComplete="name"
                  error={errors.fullName}
                  id="fullName"
                  label="Full name"
                  required
                />
                <FormField
                  autoComplete="email"
                  error={errors.email}
                  id="email"
                  label="Email address"
                  required
                  type="email"
                />
                <FormField
                  autoComplete="new-password"
                  error={errors.password}
                  id="password"
                  label="Password"
                  required
                  type="password"
                />
                <FormField
                  autoComplete="new-password"
                  error={errors.passwordConfirmation}
                  id="passwordConfirmation"
                  label="Confirm password"
                  required
                  type="password"
                />
              </div>

              <AuthCallout icon={<AppIcon filled name="verified_user" size={16} />}>
                One account provisions your workspace and signs you in. Choose a strong password;
                this demo uses the same session model as a production-style rollout.
              </AuthCallout>

              <PrimaryButton
                className="w-full min-h-12 text-sm font-semibold shadow-md shadow-primary/15 transition hover:brightness-[1.03] hover:shadow-lg hover:shadow-primary/20 active:scale-[0.99]"
                type="submit"
              >
                Create account
              </PrimaryButton>

              <div className="flex items-center justify-center gap-2 pt-1 text-sm text-on-surface-variant">
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

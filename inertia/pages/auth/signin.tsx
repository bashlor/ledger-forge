import { Form, Link } from '@adonisjs/inertia/react'
import { Head, router } from '@inertiajs/react'

import type { FormErrors } from '~/types'

import { AuthMarketingAside } from '~/components/auth_marketing_aside'
import { AuthPageShell } from '~/components/auth_page_shell'
import { PrimaryButton, SecondaryButton } from '~/components/button'
import { FormField } from '~/components/form_field'

interface SigninProps {
  allowAnonymousAuth: boolean
}

const signinAside = (
  <AuthMarketingAside
    description="A focused workspace for invoices, expenses, and balances—built for demos that still feel like real product."
    eyebrow="Ledger Forge"
    headline="Clarity for your books"
    points={[
      {
        icon: 'dashboard',
        text: 'Live dashboard with scoped dates and balances tuned for review sessions.',
      },
      {
        icon: 'receipt_long',
        text: 'Structured invoicing and expense flows with validation you can trace end to end.',
      },
      {
        icon: 'shield_lock',
        text: 'Session-backed access with the same auth patterns you would expect in production.',
      },
    ]}
  />
)

export default function Signin({ allowAnonymousAuth }: SigninProps) {
  return (
    <>
      <Head title="Sign in" />

      <AuthPageShell
        aside={signinAside}
        description="Use the email and password for your workspace. You will be redirected after a successful sign-in."
        title="Sign in"
      >
        <Form route="signin.store">
          {({ errors }: { errors: FormErrors }) => {
            return (
              <div className="space-y-5 sm:space-y-6">
                <FormField
                  autoComplete="username"
                  error={errors.email}
                  id="email"
                  label="Email address"
                  placeholder="name@organization.com"
                  required
                  type="email"
                />

                <FormField
                  autoComplete="current-password"
                  error={errors.password}
                  id="password"
                  label="Password"
                  labelAction={
                    <Link
                      className="mb-0.5 text-xs font-semibold text-primary transition-colors hover:text-primary-dim"
                      href="/forgot-password"
                    >
                      Forgot password?
                    </Link>
                  }
                  placeholder="Enter your password"
                  required
                  type="password"
                />

                <PrimaryButton
                  className="w-full min-h-12 text-sm font-semibold shadow-md shadow-primary/15 transition hover:brightness-[1.03] hover:shadow-lg hover:shadow-primary/20 active:scale-[0.99]"
                  type="submit"
                >
                  Sign in
                </PrimaryButton>

                {allowAnonymousAuth ? (
                  <SecondaryButton
                    className="w-full min-h-12 text-sm font-semibold transition hover:bg-surface-container"
                    onClick={() => router.post('/signin/anonymous')}
                    type="button"
                  >
                    Continue without an account
                  </SecondaryButton>
                ) : null}

                <div className="flex items-center justify-center gap-2 pt-1 text-sm text-on-surface-variant">
                  <span>No account yet?</span>
                  <Link
                    className="font-semibold text-primary transition-colors hover:text-primary-dim"
                    href="/signup"
                  >
                    Create an account
                  </Link>
                </div>
              </div>
            )
          }}
        </Form>
      </AuthPageShell>
    </>
  )
}

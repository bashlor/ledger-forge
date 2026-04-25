import { Form, Link } from '@adonisjs/inertia/react'
import { Head } from '@inertiajs/react'

import type { FormErrors } from '~/types'

import { AuthPageShell } from '~/components/auth_page_shell'
import { PrimaryButton } from '~/components/button'
import { FormField } from '~/components/form_field'

export default function ForgotPassword() {
  return (
    <>
      <Head title="Forgot password" />

      <AuthPageShell
        description="Enter your email and we'll send you a reset link."
        title="Forgot password"
      >
        <Form action="/forgot-password" className="space-y-6" method="post">
          {({ errors }: { errors: FormErrors }) => (
            <>
              <FormField
                autoComplete="email"
                error={errors.email}
                id="email"
                label="Email"
                type="email"
              />

              <PrimaryButton className="w-full py-3 font-headline font-bold" type="submit">
                Send reset link
              </PrimaryButton>

              <p className="text-center text-sm text-on-surface-variant">
                <Link className="font-semibold text-primary hover:text-primary-dim" href="/signin">
                  Back to login
                </Link>
              </p>
            </>
          )}
        </Form>
      </AuthPageShell>
    </>
  )
}

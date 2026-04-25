import { Form } from '@adonisjs/inertia/react'
import { Head } from '@inertiajs/react'

import type { FormErrors, InertiaProps } from '~/types'

import { AuthPageShell } from '~/components/auth_page_shell'
import { PrimaryButton } from '~/components/button'
import { FormField } from '~/components/form_field'

export default function ResetPassword({ token }: InertiaProps<{ token: string }>) {
  return (
    <>
      <Head title="Reset password" />

      <AuthPageShell description="Enter your new password below." title="Reset password">
        <Form action="/reset-password" className="space-y-6" method="post">
          {({ errors }: { errors: FormErrors }) => (
            <>
              <input name="token" type="hidden" value={token} />

              <FormField
                autoComplete="new-password"
                error={errors.newPassword}
                id="newPassword"
                label="New password"
                name="newPassword"
                type="password"
              />

              <FormField
                autoComplete="new-password"
                error={errors.newPasswordConfirmation}
                id="newPasswordConfirmation"
                label="Confirm new password"
                name="newPasswordConfirmation"
                type="password"
              />

              <PrimaryButton className="w-full py-3 font-headline font-bold" type="submit">
                Reset password
              </PrimaryButton>
            </>
          )}
        </Form>
      </AuthPageShell>
    </>
  )
}

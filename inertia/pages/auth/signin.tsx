import { Form, Link } from '@adonisjs/inertia/react'
import { Head, router } from '@inertiajs/react'

import type { FormErrors } from '~/types'

import { AppIcon } from '~/components/app_icon'
import { AuthPageShell } from '~/components/auth_page_shell'
import { PrimaryButton, SecondaryButton } from '~/components/button'
import { FormField } from '~/components/form_field'

interface SigninProps {
  allowAnonymousAuth: boolean
}

export default function Signin({ allowAnonymousAuth }: SigninProps) {
  return (
    <>
      <Head title="Secure access" />

      <AuthPageShell
        description="Use the credentials you created during signup to open the workspace."
        footer={
          <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-widest text-outline sm:gap-5">
            <span className="transition-colors hover:text-on-surface">Privacy</span>
            <span className="h-1 w-1 rounded-full bg-outline-variant" />
            <span className="transition-colors hover:text-on-surface">Security</span>
            <span className="h-1 w-1 rounded-full bg-outline-variant" />
            <span className="transition-colors hover:text-on-surface">Compliance</span>
          </div>
        }
        title="Secure access"
      >
        <Form route="signin.store">
          {({ errors }: { errors: FormErrors }) => {
            return (
              <div className="space-y-4">
                <FormField
                  autoComplete="username"
                  error={errors.email}
                  id="email"
                  label="Email address"
                  placeholder="name@organization.com"
                  required
                  type="email"
                  variant="ghost"
                />

                <FormField
                  autoComplete="current-password"
                  error={errors.password}
                  id="password"
                  label="Password"
                  labelAction={
                    <Link
                      className="mb-2 text-xs font-semibold text-primary transition-colors hover:text-primary-dim"
                      href="/forgot-password"
                    >
                      Forgot access?
                    </Link>
                  }
                  placeholder="••••••••••••"
                  required
                  type="password"
                  variant="ghost"
                />

                <div className="flex items-center gap-3 rounded-lg border border-outline-variant/10 bg-surface-container-low p-2.5">
                  <AppIcon className="text-secondary" filled name="shield_lock" size={18} />
                  <p className="text-[11px] font-medium leading-tight text-on-surface-variant">
                    Enter your signup email and password. If sign-in fails, check the red hint under
                    the password field and the toast summary.
                  </p>
                </div>

                <PrimaryButton
                  className="w-full py-3 font-headline font-bold uppercase tracking-widest shadow-md hover:shadow-lg active:scale-[0.98]"
                  type="submit"
                >
                  Authorize access
                </PrimaryButton>

                {allowAnonymousAuth ? (
                  <SecondaryButton
                    className="w-full border border-outline-variant/30 py-2.5 text-xs font-bold uppercase tracking-widest"
                    onClick={() => router.post('/signin/anonymous')}
                    type="button"
                  >
                    Continue in anonymous mode
                  </SecondaryButton>
                ) : null}

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
      </AuthPageShell>
    </>
  )
}

import { Form, Link } from '@adonisjs/inertia/react'
import { Head } from '@inertiajs/react'

import { PrimaryButton } from '~/components/button'
import { FormField } from '~/components/form_field'
import { PageHeader } from '~/components/page_header'
import { Caption, Panel } from '~/components/ui'

import type { FormErrors, InertiaProps } from '../../types'

type Props = InertiaProps<{
  bootstrap: {
    currentUser: null | {
      email: string
      fullName: null | string
    }
    defaults: {
      email: string
      fullName: string
      password: string
    }
  }
}>

const secondaryLinkClass =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant/20 bg-surface-container-highest px-4 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high'

export default function DevAccessPage({ bootstrap }: Props) {
  return (
    <>
      <Head title="Dev tools access" />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10">
        <PageHeader
          description="Development-only bootstrap page for a local dev operator. It can create the account if it does not exist yet, then grant access to the Dev Inspector."
          eyebrow="Development"
          title="Dev Tools Access"
        />

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Panel as="div" className="p-6">
            <h2 className="text-base font-semibold text-on-surface">Bootstrap local access</h2>
            <Caption className="mt-2">
              Submit the credentials below to sign in an existing local account or create it on the
              fly. The resulting account is then granted dev operator access in the local database.
            </Caption>

            <Form action="/_dev/access" className="mt-6 space-y-5" method="post">
              {({ errors }: { errors: FormErrors }) => {
                return (
                  <>
                    <FormField
                      defaultValue={bootstrap.defaults.fullName}
                      error={errors.fullName}
                      id="fullName"
                      label="Full name"
                      name="fullName"
                      placeholder="Dev Operator"
                    />
                    <FormField
                      autoComplete="username"
                      defaultValue={bootstrap.defaults.email}
                      error={errors.email}
                      id="email"
                      label="Email"
                      name="email"
                      placeholder="dev-operator@example.local"
                      required
                      type="email"
                    />
                    <FormField
                      autoComplete="new-password"
                      defaultValue={bootstrap.defaults.password}
                      error={errors.password}
                      id="password"
                      label="Password"
                      name="password"
                      required
                      type="password"
                    />
                    <FormField
                      autoComplete="new-password"
                      defaultValue={bootstrap.defaults.password}
                      error={errors.passwordConfirmation}
                      id="passwordConfirmation"
                      label="Confirm password"
                      name="passwordConfirmation"
                      required
                      type="password"
                    />

                    <div className="flex flex-wrap gap-3 pt-2">
                      <PrimaryButton type="submit">Provision dev operator</PrimaryButton>
                      <Link className={secondaryLinkClass} href="/signin">
                        Open standard sign-in
                      </Link>
                    </div>
                  </>
                )
              }}
            </Form>
          </Panel>

          <div className="space-y-6">
            <Panel as="section" className="p-6">
              <h2 className="text-base font-semibold text-on-surface">Current session</h2>
              {bootstrap.currentUser ? (
                <div className="mt-4 space-y-2 text-sm text-on-surface-variant">
                  <p>
                    Signed in as{' '}
                    <span className="font-semibold text-on-surface">
                      {bootstrap.currentUser.fullName ?? bootstrap.currentUser.email}
                    </span>
                  </p>
                  <p>{bootstrap.currentUser.email}</p>
                </div>
              ) : (
                <Caption className="mt-4">
                  No active session was detected. Submitting the form will create or sign in the
                  local dev operator and redirect directly to the Dev Inspector.
                </Caption>
              )}
            </Panel>

            <Panel as="section" className="p-6">
              <h2 className="text-base font-semibold text-on-surface">How it works</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-on-surface-variant">
                <li>The page is available only when development tools are enabled.</li>
                <li>
                  The account is created if the email does not exist yet, otherwise it is signed in.
                </li>
                <li>
                  The database stores a local dev operator grant so the Dev Inspector can be
                  reopened later.
                </li>
              </ul>
            </Panel>
          </div>
        </section>
      </div>
    </>
  )
}

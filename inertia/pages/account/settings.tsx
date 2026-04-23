import { Form } from '@adonisjs/inertia/react'
import { type Data } from '@generated/data'
import { usePage } from '@inertiajs/react'

import { PrimaryButton } from '~/components/button'
import { FormField } from '~/components/form_field'

interface SettingsProps {
  user: null | {
    email: string
    image: null | string
    isAnonymous: boolean
    name: string
  }
}

export default function Settings({ user }: SettingsProps) {
  const page = usePage<Data.SharedProps>()
  const workspace = page.props.workspace

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-1">
        <div className="rounded-2xl bg-surface-container-lowest p-8 shadow-card">
          <p className="text-sm text-on-surface-variant">Unable to load account data.</p>
        </div>
      </div>
    )
  }

  const isAnonymous = user.isAnonymous

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-[1.75rem] border border-outline-variant/15 bg-surface-container-lowest px-6 py-6 shadow-ambient-tight sm:px-7">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              Workspace
            </p>
            <h1 className="mt-3 font-headline text-3xl font-extrabold tracking-tight text-on-surface">
              Account settings
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
              Keep profile and credential changes on one screen without leaving the shell.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl bg-surface-container-low px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                Identity
              </p>
              <p className="mt-1.5 text-sm font-semibold text-on-surface">{user.name}</p>
              <p className="mt-0.5 text-sm text-on-surface-variant">{user.email}</p>
            </div>
            <div className="rounded-2xl bg-surface-container-low px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                Security
              </p>
              <p className="mt-1.5 text-sm font-semibold text-on-surface">
                {isAnonymous ? 'Anonymous session' : 'Password protected'}
              </p>
              <p className="mt-0.5 text-sm text-on-surface-variant">
                {isAnonymous
                  ? 'Anonymous accounts can browse the workspace but cannot change profile or credentials.'
                  : 'Rotate credentials when needed.'}
              </p>
            </div>
            {workspace ? (
              <div className="rounded-2xl bg-surface-container-low px-4 py-3 sm:col-span-2 lg:col-span-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                  Active workspace
                </p>
                <p className="mt-1.5 text-sm font-semibold text-on-surface">{workspace.name}</p>
                <p className="mt-0.5 truncate font-mono text-xs text-on-surface-variant">
                  {workspace.slug}
                </p>
                {workspace.isAnonymousWorkspace ? (
                  <p className="mt-2 text-xs text-on-surface-variant">
                    Dedicated anonymous workspace — upgrade to a full account to keep data under a
                    named organization later.
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-on-surface-variant">
                    This workspace was created for your account. Organization switching may be added
                    in a future update.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className="rounded-[1.75rem] border border-outline-variant/15 bg-surface-container-lowest p-6 shadow-ambient-tight sm:p-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Profile
            </p>
            <h2 className="mt-3 font-headline text-2xl font-extrabold tracking-tight text-on-surface">
              Public identity
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              {isAnonymous
                ? 'Anonymous sessions are read-only and cannot update profile details.'
                : 'Update the operator name shown across the workspace.'}
            </p>
          </div>

          {!isAnonymous ? (
            <Form className="mt-6 space-y-5" route="account.store">
              {({ errors }) => (
                <>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
                        htmlFor="email"
                      >
                        Email
                      </label>
                      <input
                        className="w-full rounded-xl border border-outline-variant/35 bg-surface-container-low px-3 py-3 text-sm text-on-surface-variant outline-hidden"
                        defaultValue={user.email}
                        disabled
                        id="email"
                        type="email"
                      />
                    </div>

                    <FormField error={errors.name} id="name" label="Full name" value={user.name} />
                  </div>

                  <div className="flex justify-end">
                    <PrimaryButton
                      className="min-w-44 rounded-xl py-3 font-headline font-bold"
                      type="submit"
                    >
                      Update profile
                    </PrimaryButton>
                  </div>
                </>
              )}
            </Form>
          ) : (
            <div className="mt-6 rounded-2xl bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant">
              Anonymous mode keeps this page visible for inspection only. Create a full account to
              edit your profile or password.
            </div>
          )}
        </section>

        {!isAnonymous ? (
          <section className="rounded-[1.75rem] border border-outline-variant/15 bg-surface-container-lowest p-6 shadow-ambient-tight sm:p-7">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Security
              </p>
              <h2 className="mt-3 font-headline text-2xl font-extrabold tracking-tight text-on-surface">
                Change password
              </h2>
              <p className="mt-2 text-sm text-on-surface-variant">
                Keep a username field for browser accessibility and update credentials inline.
              </p>
            </div>

            <Form className="mt-6 space-y-5" route="account.password.update">
              {({ errors }) => (
                <>
                  <input
                    autoComplete="username"
                    className="sr-only"
                    defaultValue={user.email}
                    name="username"
                    readOnly
                    tabIndex={-1}
                    type="text"
                  />

                  <div className="grid gap-5">
                    <FormField
                      autoComplete="current-password"
                      error={errors.currentPassword}
                      id="currentPassword"
                      label="Current password"
                      type="password"
                    />

                    <div className="grid gap-5 md:grid-cols-2">
                      <FormField
                        autoComplete="new-password"
                        error={errors.newPassword}
                        id="newPassword"
                        label="New password"
                        type="password"
                      />

                      <FormField
                        autoComplete="new-password"
                        error={errors.newPasswordConfirmation}
                        id="newPasswordConfirmation"
                        label="Confirm new password"
                        type="password"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <PrimaryButton
                      className="min-w-44 rounded-xl py-3 font-headline font-bold"
                      type="submit"
                    >
                      Change password
                    </PrimaryButton>
                  </div>
                </>
              )}
            </Form>
          </section>
        ) : null}
      </div>
    </div>
  )
}

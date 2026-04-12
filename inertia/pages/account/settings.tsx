import { Form } from '@adonisjs/inertia/react'

interface SettingsProps {
  user: null | {
    email: string
    image: null | string
    name: string
  }
}

export default function Settings({ user }: SettingsProps) {
  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-1">
        <div className="rounded-2xl bg-surface-container-lowest p-8 shadow-card">
          <p className="text-sm text-on-surface-variant">Unable to load account data.</p>
        </div>
      </div>
    )
  }

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

          <div className="grid gap-3 sm:grid-cols-2">
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
              <p className="mt-1.5 text-sm font-semibold text-on-surface">Password protected</p>
              <p className="mt-0.5 text-sm text-on-surface-variant">Rotate credentials when needed.</p>
            </div>
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
              Update the operator name shown across the workspace.
            </p>
          </div>

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

                  <div className="space-y-2">
                    <label
                      className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
                      htmlFor="name"
                    >
                      Full name
                    </label>
                    <input
                      className="w-full rounded-xl border border-outline-variant/35 bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
                      data-invalid={errors.name ? 'true' : undefined}
                      defaultValue={user.name}
                      id="name"
                      name="name"
                      type="text"
                    />
                    {errors.name ? <p className="text-sm font-medium text-error">{errors.name}</p> : null}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    className="inline-flex min-w-44 items-center justify-center rounded-xl px-4 py-3 font-headline text-sm font-bold text-on-primary milled-steel-gradient transition-all hover:opacity-95"
                    type="submit"
                  >
                    Update profile
                  </button>
                </div>
              </>
            )}
          </Form>
        </section>

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
                  <Field
                    autoComplete="current-password"
                    error={errors.currentPassword}
                    id="currentPassword"
                    label="Current password"
                    name="currentPassword"
                    type="password"
                  />

                  <div className="grid gap-5 md:grid-cols-2">
                    <Field
                      autoComplete="new-password"
                      error={errors.newPassword}
                      id="newPassword"
                      label="New password"
                      name="newPassword"
                      type="password"
                    />

                    <Field
                      autoComplete="new-password"
                      error={errors.newPasswordConfirmation}
                      id="newPasswordConfirmation"
                      label="Confirm new password"
                      name="newPasswordConfirmation"
                      type="password"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    className="inline-flex min-w-44 items-center justify-center rounded-xl px-4 py-3 font-headline text-sm font-bold text-on-primary milled-steel-gradient transition-all hover:opacity-95"
                    type="submit"
                  >
                    Change password
                  </button>
                </div>
              </>
            )}
          </Form>
        </section>
      </div>
    </div>
  )
}

function Field({
  autoComplete,
  error,
  id,
  label,
  name,
  type,
}: {
  autoComplete?: string
  error?: string
  id: string
  label: string
  name: string
  type: string
}) {
  return (
    <div className="space-y-2">
      <label
        className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
        htmlFor={id}
      >
        {label}
      </label>
      <input
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-outline-variant/35 bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
        data-invalid={error ? 'true' : undefined}
        id={id}
        name={name}
        type={type}
      />
      {error ? <p className="text-sm font-medium text-error">{error}</p> : null}
    </div>
  )
}

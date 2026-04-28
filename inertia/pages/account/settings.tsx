import { Form, Link } from '@adonisjs/inertia/react'
import { type Data } from '@generated/data'
import { Head, usePage } from '@inertiajs/react'
import { useState } from 'react'

import { PrimaryButton } from '~/components/button'
import { FormField } from '~/components/form_field'
import { PageHeader } from '~/components/page_header'

interface SettingsProps {
  user: null | {
    email: string
    image: null | string
    isAnonymous: boolean
    name: string
  }
}

type SettingsSection = 'billing' | 'danger' | 'profile' | 'security' | 'workspace'

const SECTION_NAV: {
  disabled?: boolean
  hint?: string
  id: SettingsSection
  label: string
}[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
  { id: 'workspace', label: 'Workspace' },
  { disabled: true, hint: 'Coming soon', id: 'billing', label: 'Billing' },
  { id: 'danger', label: 'Danger zone' },
]

const CARD_CLASS =
  'rounded-xl border border-slate-200/95 bg-white p-6 shadow-md shadow-slate-900/[0.06] ring-1 ring-slate-900/[0.04] sm:p-7'

const FIELD_CLASS =
  'h-10 min-h-10 w-full rounded-xl border border-border-default bg-white px-3 text-sm text-on-surface shadow-sm outline-hidden ring-1 ring-slate-900/[0.05] transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60'

export default function Settings({ user }: SettingsProps) {
  const page = usePage<Data.SharedProps>()
  const workspace = page.props.workspace
  const permissions = page.props.permissions
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')

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
    <>
      <Head title="Settings" />

      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          description="Manage profile, security and workspace preferences."
          eyebrow="Account"
          title="Settings"
        />

        {isAnonymous ? (
          <aside
            aria-label="Anonymous session notice"
            className="rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 to-white px-5 py-4 shadow-sm ring-1 ring-amber-900/[0.06] sm:px-6 sm:py-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-lg border border-amber-300/90 bg-amber-100/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-950">
                    Anonymous
                  </span>
                  <span className="text-sm font-semibold text-slate-900">Limited session</span>
                </div>
                <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
                  You can explore the workspace in read-only mode. Profile and credentials cannot be
                  changed until you create a full account.
                </p>
              </div>
              <Link
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-md shadow-primary/25 transition-colors duration-150 hover:bg-primary-dim"
                href="/signup"
              >
                Create full account
              </Link>
            </div>
          </aside>
        ) : null}

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          <nav
            aria-label="Settings sections"
            className="flex shrink-0 gap-2 overflow-x-auto pb-1 lg:w-52 lg:flex-col lg:overflow-visible lg:pb-0"
          >
            {SECTION_NAV.map((item) => {
              const isActive = activeSection === item.id
              const isDisabled = item.disabled === true
              return (
                <button
                  aria-current={isActive ? 'page' : undefined}
                  className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors duration-150 lg:w-full ${
                    isDisabled
                      ? 'cursor-not-allowed text-slate-400'
                      : isActive
                        ? 'bg-primary/10 text-primary ring-1 ring-primary/15'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                  disabled={isDisabled}
                  key={item.id}
                  onClick={() => {
                    if (!isDisabled) setActiveSection(item.id)
                  }}
                  type="button"
                >
                  <span className="block">{item.label}</span>
                  {item.hint ? (
                    <span className="mt-0.5 block text-[11px] font-normal text-slate-400">{item.hint}</span>
                  ) : null}
                </button>
              )
            })}
          </nav>

          <div className="min-w-0 flex-1 space-y-6">
            {activeSection === 'profile' ? (
              <section aria-labelledby="settings-profile-heading" className={CARD_CLASS}>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                    Profile
                  </p>
                  <h2
                    className="mt-2 font-headline text-xl font-bold tracking-tight text-slate-950 sm:text-2xl"
                    id="settings-profile-heading"
                  >
                    Identity
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {isAnonymous
                      ? 'Anonymous sessions are read-only; profile fields cannot be edited.'
                      : 'Update how your name appears across the workspace.'}
                  </p>
                </div>

                <div className="mt-6 space-y-5">
                  <div>
                    <p className="form-label-caps">Account status</p>
                    <div className="mt-2">
                      <span
                        className={`inline-flex rounded-lg border px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ring-inset ${
                          isAnonymous
                            ? 'border-violet-200/85 bg-violet-50 text-violet-900 ring-violet-900/8'
                            : 'border-emerald-200/80 bg-emerald-50 text-emerald-800 ring-emerald-900/5'
                        }`}
                      >
                        {isAnonymous ? 'Anonymous session' : 'Registered account'}
                      </span>
                    </div>
                  </div>

                  {!isAnonymous ? (
                    <Form className="space-y-5" route="account.store">
                      {({ errors }) => (
                        <>
                          <div className="grid gap-5 md:grid-cols-2">
                            <div className="space-y-2">
                              <label className="form-label-caps" htmlFor="email">
                                Email
                              </label>
                              <input
                                className={FIELD_CLASS}
                                defaultValue={user.email}
                                disabled
                                id="email"
                                type="email"
                              />
                            </div>
                            <FormField error={errors.name} id="name" label="Full name" value={user.name} />
                          </div>
                          <div className="flex justify-end border-t border-slate-200/80 pt-6">
                            <PrimaryButton className="min-w-44 rounded-xl py-3 font-headline font-bold" type="submit">
                              Save changes
                            </PrimaryButton>
                          </div>
                        </>
                      )}
                    </Form>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="form-label-caps" htmlFor="profile-email-readonly">
                          Email
                        </label>
                        <input
                          className={FIELD_CLASS}
                          id="profile-email-readonly"
                          readOnly
                          type="text"
                          value={user.email}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="form-label-caps" htmlFor="profile-name-readonly">
                          Display name
                        </label>
                        <input
                          className={FIELD_CLASS}
                          id="profile-name-readonly"
                          readOnly
                          type="text"
                          value={user.name || 'Anonymous'}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            {activeSection === 'security' ? (
              <section aria-labelledby="settings-security-heading" className={CARD_CLASS}>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                    Security
                  </p>
                  <h2
                    className="mt-2 font-headline text-xl font-bold tracking-tight text-slate-950 sm:text-2xl"
                    id="settings-security-heading"
                  >
                    Access and credentials
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {isAnonymous
                      ? 'Security controls are limited for anonymous sessions.'
                      : 'Keep your password current and understand how you access the app.'}
                  </p>
                </div>

                {isAnonymous ? (
                  <dl className="mt-6 space-y-4 border-t border-slate-200/80 pt-6">
                    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
                      <dt className="text-sm font-medium text-slate-500">Password</dt>
                      <dd className="text-sm font-semibold text-slate-900">Not set (anonymous)</dd>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
                      <dt className="text-sm font-medium text-slate-500">Session</dt>
                      <dd className="text-sm font-semibold text-slate-900">Anonymous / read-only</dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-sm font-medium text-slate-500">Workspace permissions</dt>
                      <dd className="text-sm text-slate-700">
                        <ul className="mt-1 list-inside list-disc space-y-1">
                          <li>Dashboard: {permissions.canViewOverview ? 'View' : 'No access'}</li>
                          <li>Accounting data: {permissions.canReadAccounting ? 'Read' : 'No access'}</li>
                          <li>Organization: {permissions.canViewOrganization ? 'View' : 'No access'}</li>
                          <li>Audit trail: {permissions.canViewAuditTrail ? 'View' : 'No access'}</li>
                        </ul>
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <Form className="mt-6 space-y-5 border-t border-slate-200/80 pt-6" route="account.password.update">
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
                        <div className="flex justify-end border-t border-slate-200/80 pt-6">
                          <PrimaryButton className="min-w-44 rounded-xl py-3 font-headline font-bold" type="submit">
                            Update password
                          </PrimaryButton>
                        </div>
                      </>
                    )}
                  </Form>
                )}
              </section>
            ) : null}

            {activeSection === 'workspace' ? (
              <section aria-labelledby="settings-workspace-heading" className={CARD_CLASS}>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                    Workspace
                  </p>
                  <h2
                    className="mt-2 font-headline text-xl font-bold tracking-tight text-slate-950 sm:text-2xl"
                    id="settings-workspace-heading"
                  >
                    Active workspace
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    The organization context used for accounting data in this session.
                  </p>
                </div>

                {workspace ? (
                  <div className="mt-6 space-y-5 border-t border-slate-200/80 pt-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-slate-950">{workspace.name}</p>
                      {workspace.isAnonymousWorkspace ? (
                        <span className="inline-flex rounded-lg border border-slate-200/90 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                          Anonymous workspace
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <p className="form-label-caps">Workspace ID</p>
                      <p className="mt-2 break-all font-mono text-sm text-slate-800">{workspace.slug}</p>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600">
                      {workspace.isAnonymousWorkspace
                        ? 'This dedicated workspace is tied to your anonymous session. A full account lets you keep data under a named organization later.'
                        : 'This workspace was created for your account. Organization switching may be added in a future update.'}
                    </p>
                  </div>
                ) : (
                  <p className="mt-6 border-t border-slate-200/80 pt-6 text-sm text-slate-600">
                    No active workspace is loaded for this session.
                  </p>
                )}
              </section>
            ) : null}

            {activeSection === 'billing' ? (
              <section aria-labelledby="settings-billing-heading" className={CARD_CLASS}>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                    Billing
                  </p>
                  <h2
                    className="mt-2 font-headline text-xl font-bold tracking-tight text-slate-950 sm:text-2xl"
                    id="settings-billing-heading"
                  >
                    Plans and invoices
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Billing and subscription management will be available in a future release.
                  </p>
                </div>
                <p className="mt-6 border-t border-slate-200/80 pt-6 text-sm text-slate-500">Coming soon.</p>
              </section>
            ) : null}

            {activeSection === 'danger' ? (
              <section aria-labelledby="settings-danger-heading" className={CARD_CLASS}>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
                    Danger zone
                  </p>
                  <h2
                    className="mt-2 font-headline text-xl font-bold tracking-tight text-slate-950 sm:text-2xl"
                    id="settings-danger-heading"
                  >
                    Destructive actions
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Actions that permanently remove data or access are not available in this release.
                  </p>
                </div>
                <p className="mt-6 border-t border-slate-200/80 pt-6 text-sm text-slate-600">
                  Account deletion and similar controls will appear here when supported.
                </p>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}

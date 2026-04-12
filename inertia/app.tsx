import './css/tailwind.css'
import type { Data } from '@generated/data'
import type { ReactElement } from 'react'

import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import { TuyauProvider } from '@adonisjs/inertia/react'
import { createInertiaApp } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'

import { client } from '~/client'
import AppShellLayout from '~/layouts/app_shell'
import PublicLayout from '~/layouts/public'

const appName = import.meta.env.VITE_APP_NAME || 'Precision Ledger'

function wrapPage(name: string, page: ReactElement<Data.SharedProps>) {
  const usesShell = name.startsWith('app/') || name.startsWith('account/')
  return usesShell ? <AppShellLayout>{page}</AppShellLayout> : <PublicLayout>{page}</PublicLayout>
}

createInertiaApp({
  progress: {
    color: '#4B5563',
    delay: 200,
    showSpinner: false,
  },
  resolve: (name) => {
    return resolvePageComponent(
      `./pages/${name}.tsx`,
      import.meta.glob('./pages/**/*.tsx'),
      (page: ReactElement<Data.SharedProps>) => wrapPage(name, page)
    )
  },
  setup({ App, el, props }) {
    createRoot(el).render(
      <TuyauProvider client={client}>
        <App {...props} />
      </TuyauProvider>
    )
  },
  title: (title) => (title ? `${title} - ${appName}` : appName),
})

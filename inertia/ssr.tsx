import type { Data } from '@generated/data'
import type { ReactElement } from 'react'

import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import { TuyauProvider } from '@adonisjs/inertia/react'
import { createInertiaApp } from '@inertiajs/react'
import ReactDOMServer from 'react-dom/server'

import { client } from '~/client'
import AppShellLayout from '~/layouts/app_shell'
import PublicLayout from '~/layouts/public'

export default function render(page: any) {
  return createInertiaApp({
    page,
    render: ReactDOMServer.renderToString,
    resolve: (name) => {
      return resolvePageComponent(
        `./pages/${name}.tsx`,
        import.meta.glob('./pages/**/*.tsx', { eager: true }),
        (component: ReactElement<Data.SharedProps>) => wrapPage(name, component)
      )
    },
    setup: ({ App, props }) => (
      <TuyauProvider client={client}>
        <App {...props} />
      </TuyauProvider>
    ),
  })
}

function wrapPage(name: string, page: ReactElement<Data.SharedProps>) {
  const usesShell = name.startsWith('app/') || name.startsWith('account/')
  return usesShell ? <AppShellLayout>{page}</AppShellLayout> : <PublicLayout>{page}</PublicLayout>
}

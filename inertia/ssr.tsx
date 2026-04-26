import type { Data } from '@generated/data'
import type { ReactElement } from 'react'

import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import { TuyauProvider } from '@adonisjs/inertia/react'
import { createInertiaApp } from '@inertiajs/react'
import ReactDOMServer from 'react-dom/server'

import { client } from '~/client'
import AppShellLayout from '~/layouts/app_shell'
import PublicLayout from '~/layouts/public'

const includeDevToolsPages =
  import.meta.env.DEV || import.meta.env.VITE_INCLUDE_DEV_TOOLS === 'true'
const pageModules = includeDevToolsPages
  ? import.meta.glob('./pages/**/*.tsx', { eager: true })
  : import.meta.glob(['./pages/**/*.tsx', '!./pages/dev/**/*.tsx'], { eager: true })

export default function render(page: any) {
  return createInertiaApp({
    page,
    render: ReactDOMServer.renderToString,
    resolve: (name) => {
      return resolvePageComponent(
        `./pages/${name}.tsx`,
        pageModules,
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
  const usesShell =
    name.startsWith('app/') || name.startsWith('account/') || name.startsWith('dev/')
  return usesShell ? <AppShellLayout>{page}</AppShellLayout> : <PublicLayout>{page}</PublicLayout>
}

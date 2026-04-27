import type { Config } from '@japa/runner/types'

import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { sessionBrowserClient } from '@adonisjs/session/plugins/browser_client'
import { apiClient } from '@japa/api-client'
import { assert } from '@japa/assert'
import { browserClient, decoratorsCollection } from '@japa/browser-client'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'

const browserTimeout = Number(process.env.BROWSER_TEST_TIMEOUT_MS ?? '5000')
const browserNavigationTimeout = Number(process.env.BROWSER_TEST_NAVIGATION_TIMEOUT_MS ?? '8000')

decoratorsCollection.register({
  page(page) {
    page.setDefaultTimeout(browserTimeout)
    page.setDefaultNavigationTimeout(browserNavigationTimeout)
  },
})

export const plugins: Config['plugins'] = [
  assert(),
  pluginAdonisJS(app),
  apiClient(),
  browserClient({
    assertions: {
      pollIntervals: [100, 250, 500],
      timeout: browserTimeout,
    },
    contextOptions: {
      ignoreHTTPSErrors: true,
    },
    runInSuites: ['browser'],
    tracing: {
      cleanOutputDirectory: true,
      enabled: true,
      event: 'onError',
      outputDirectory: process.env.JAPA_BROWSER_TRACES_DIR ?? 'tmp/reports/e2e/traces',
    },
  }),
  sessionBrowserClient(app),
]

/**
 * Configure lifecycle function to run before and after all the
 * tests.
 *
 * The setup functions are executed before all the tests
 * The teardown functions are executed after all the tests
 */
export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [],
  teardown: [],
}

/**
 * Configure suites by tapping into the test suite instance.
 * Learn more - https://japa.dev/docs/test-suites#lifecycle-hooks
 */
export const configureSuite: Config['configureSuite'] = (suite) => {
  if (['browser', 'e2e', 'routes'].includes(suite.name)) {
    return suite.setup(() => testUtils.httpServer().start())
  }
}

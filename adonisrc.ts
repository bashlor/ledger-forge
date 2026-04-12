import { defineConfig } from '@adonisjs/core/app'
import { indexPages } from '@adonisjs/inertia'
import { generateRegistry } from '@tuyau/core/hooks'

export default defineConfig({
  /*
  |--------------------------------------------------------------------------
  | Commands
  |--------------------------------------------------------------------------
  |
  | List of ace commands to register from packages. The application commands
  | will be scanned automatically from the "./commands" directory.
  |
  */
  commands: [() => import('@adonisjs/core/commands'), () => import('@adonisjs/inertia/commands')],

  /*
  |--------------------------------------------------------------------------
  | Directories
  |--------------------------------------------------------------------------
  |
  | Override default directory locations used by AdonisJS.
  |
  */
  directories: {
    config: 'app/core/common/config',
    database: 'app/core/common/database',
    exceptions: 'app/core/common/exceptions',
    middleware: 'app/core/common/middlewares',
    migrations: 'app/core/common/database/migrations',
    models: 'app/core/common/models',
    providers: 'app/core/common/providers',
    views: 'app/core/common/resources/views',
  },

  /*
  |--------------------------------------------------------------------------
  | Experimental flags
  |--------------------------------------------------------------------------
  |
  | The following features will be enabled by default in the next major release
  | of AdonisJS. You can opt into them today to avoid any breaking changes
  | during upgrade.
  |
  */
  experimental: {},

  hooks: {
    buildStarting: [() => import('@adonisjs/vite/build_hook')],
    init: [indexPages({ framework: 'react', source: 'inertia/pages' }), generateRegistry()],
  },

  /*
  |--------------------------------------------------------------------------
  | Metafiles
  |--------------------------------------------------------------------------
  |
  | A collection of files you want to copy to the build folder when creating
  | the production build.
  |
  */
  metaFiles: [
    {
      pattern: 'app/core/common/resources/views/**/*.edge',
      reloadServer: false,
    },
    {
      pattern: 'public/**',
      reloadServer: false,
    },
  ],

  /*
  |--------------------------------------------------------------------------
  | Preloads
  |--------------------------------------------------------------------------
  |
  | List of modules to import before starting the application.
  |
  */
  preloads: [
    () => import('#core/accounting/routes/api_routes'),
    () => import('#core/accounting/routes/web_routes'),
    () => import('#core/user_management/http/routes/api_routes'),
    () => import('#core/user_management/http/routes/inertia_routes'),
    () => import('#start/kernel'),
  ],

  /*
  |--------------------------------------------------------------------------
  | Service providers
  |--------------------------------------------------------------------------
  |
  | List of service providers to import and register when booting the
  | application
  |
  */
  providers: [
    () => import('@adonisjs/core/providers/app_provider'),
    () => import('@adonisjs/core/providers/hash_provider'),
    {
      environment: ['repl', 'test'],
      file: () => import('@adonisjs/core/providers/repl_provider'),
    },
    () => import('@adonisjs/core/providers/vinejs_provider'),
    () => import('@adonisjs/core/providers/edge_provider'),
    () => import('@adonisjs/session/session_provider'),
    () => import('@adonisjs/vite/vite_provider'),
    () => import('@adonisjs/shield/shield_provider'),
    () => import('@adonisjs/static/static_provider'),
    () => import('#core/common/providers/drizzle_provider'),
    () => import('#core/user_management/providers/auth_provider'),
    () => import('@adonisjs/cors/cors_provider'),
    () => import('@adonisjs/inertia/inertia_provider'),
  ],

  /*
  |--------------------------------------------------------------------------
  | Tests
  |--------------------------------------------------------------------------
  |
  | List of test suites to organize tests by their type. Feel free to remove
  | and add additional suites.
  |
  */
  tests: {
    forceExit: false,
    suites: [
      {
        files: ['app/**/*_spec.{ts,js}', 'tests/**/*_spec.{ts,js}'],
        name: 'unit',
        timeout: 2000,
      },
      {
        files: ['app/**/*_int.{ts,js}', 'tests/**/*_int.{ts,js}'],
        name: 'integration',
        timeout: 10000,
      },
      {
        files: ['app/**/*_feat.{ts,js}', 'tests/**/*_feat.{ts,js}'],
        name: 'routes',
        timeout: 30000,
      },
      {
        files: ['app/**/*_e2e.{ts,js}', 'tests/**/*_e2e.{ts,js}'],
        name: 'browser',
        timeout: 300000,
      },
      {
        files: ['tests/**/*_console.spec.ts'],
        name: 'console',
        timeout: 60000,
      },
    ],
  },
})

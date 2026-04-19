import env from '#start/env'
import { defineConfig, syncDestination, targets } from '@adonisjs/core/logger'
import app from '@adonisjs/core/services/app'

const loggerConfig = defineConfig({
  /**
   * Default logger name used by ctx.logger and app logger calls.
   */
  default: 'app',

  loggers: {
    app: {
      /**
       * Use sync destination in non-production for immediate flush.
       */
      destination: !app.inProduction ? await syncDestination() : undefined,

      /**
       * Toggle this logger on/off.
       */
      enabled: true,

      /**
       * Minimum level to output (trace, debug, info, warn, error, fatal).
       */
      level: env.get('LOG_LEVEL'),

      /**
       * Logger name shown in log records.
       */
      name: env.get('APP_NAME'),

      /**
       * Redact sensitive fields from log output.
       */
      redact: {
        paths: [
          'accessToken',
          '*.accessToken',
          'authorization',
          '*.authorization',
          'cookie',
          '*.cookie',
          'credentials',
          '*.credentials',
          'headers.authorization',
          '*.headers.authorization',
          'headers.cookie',
          '*.headers.cookie',
          'password',
          '*.password',
          'currentPassword',
          '*.currentPassword',
          'newPassword',
          '*.newPassword',
          'refreshToken',
          '*.refreshToken',
          'resetToken',
          '*.resetToken',
          'set-cookie',
          '*.set-cookie',
          'token',
          '*.token',
        ],
      },

      /**
       * Configure where logs are written.
       */
      transport: {
        targets: [targets.file({ destination: 1 })],
      },
    },
  },
})

export default loggerConfig

/**
 * Inferring types for the list of loggers you have configured
 * in your application.
 */
declare module '@adonisjs/core/types' {
  export interface LoggersList extends InferLoggers<typeof loggerConfig> {}
}

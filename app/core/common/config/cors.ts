import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/cors'

/**
 * Configuration options to tweak the CORS policy. The following
 * options are documented on the official documentation website.
 *
 * https://docs.adonisjs.com/guides/security/cors
 */
function parseCorsAllowedOrigins(raw: string | undefined): string[] {
  if (raw === undefined || raw.trim() === '') {
    return []
  }
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0)
}

const allowedOrigins = parseCorsAllowedOrigins(env.get('CORS_ALLOWED_ORIGINS'))

const corsConfig = defineConfig({
  /**
   * Allow cookies/authorization headers on cross-origin requests.
   */
  credentials: true,

  /**
   * Enable or disable CORS handling globally.
   */
  enabled: true,

  /**
   * Response headers exposed to the browser.
   */
  exposeHeaders: [],

  /**
   * Reflect request headers by default. Use a string array to restrict
   * allowed headers.
   */
  headers: true,

  /**
   * Cache CORS preflight response for N seconds.
   */
  maxAge: 90,

  /**
   * HTTP methods accepted for cross-origin requests.
   */
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],

  /**
   * In development, allow every origin to simplify local front/backend setup.
   * In other environments, use CORS_ALLOWED_ORIGINS (comma-separated) or an
   * empty allowlist when unset (no cross-origin browser access).
   */
  origin: app.inDev ? true : allowedOrigins.length > 0 ? allowedOrigins : [],
})

export default corsConfig

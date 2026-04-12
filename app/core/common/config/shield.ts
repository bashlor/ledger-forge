import { defineConfig } from '@adonisjs/shield'

const shieldConfig = defineConfig({
  /**
   * Disable browsers from sniffing content types and rely only
   * on the response content-type header.
   */
  contentTypeSniffing: {
    /**
     * Enable X-Content-Type-Options: nosniff.
     */
    enabled: true,
  },

  /**
   * Configure CSP policies for your app. Refer documentation
   * to learn more.
   */
  csp: {
    /**
     * Per-resource CSP directives.
     * Uses @adonisjs/shield nonce support — Vite injects `nonce` on script/style tags.
     */
    directives: {
      connectSrc: ["'self'", 'ws:'],
      defaultSrc: ["'self'"],
      fontSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      scriptSrc: ["'self'", '@nonce'],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },

    /**
     * Enable the Content-Security-Policy header.
     */
    enabled: true,

    /**
     * Report violations without blocking resources.
     */
    reportOnly: false,
  },

  /**
   * Configure CSRF protection options. Refer documentation
   * to learn more.
   */
  csrf: {
    /**
     * Enable CSRF token verification for state-changing requests.
     */
    enabled: process.env.NODE_ENV !== 'test',

    /**
     * Expose an encrypted XSRF-TOKEN cookie for frontend HTTP clients.
     */
    enableXsrfCookie: true,

    /**
     * Route patterns to exclude from CSRF checks.
     * Better Auth handles its own security for /api/auth/* routes.
     */
    exceptRoutes: ['/api/auth/*'],

    /**
     * HTTP methods protected by CSRF validation.
     */
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  },

  /**
   * Force browser to always use HTTPS.
   */
  hsts: {
    /**
     * Enable the Strict-Transport-Security header.
     */
    enabled: true,

    /**
     * HSTS policy duration remembered by browsers.
     */
    maxAge: '180 days',
  },

  /**
   * Control how your website should be embedded inside
   * iframes.
   */
  xFrame: {
    /**
     * Block all framing attempts. Default value is DENY.
     */
    action: 'DENY',

    /**
     * Enable the X-Frame-Options header.
     */
    enabled: true,
  },
})

export default shieldConfig

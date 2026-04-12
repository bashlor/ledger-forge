/*
|--------------------------------------------------------------------------
| HTTP kernel file
|--------------------------------------------------------------------------
|
| The HTTP kernel file is used to register the middleware with the server
| or the router.
|
*/

import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'

/**
 * The error handler is used to convert an exception
 * to a HTTP response.
 */
server.errorHandler(() => import('../exceptions/handler.js'))

/**
 * The server middleware stack runs middleware on all the HTTP
 * requests, even if there is no route registered for
 * the request URL.
 */
server.use([
  () => import('../middlewares/container_bindings_middleware.js'),
  () => import('@adonisjs/static/static_middleware'),
  () => import('@adonisjs/cors/cors_middleware'),
  () => import('@adonisjs/vite/vite_middleware'),
  // Must run before inertia_middleware so ctx.authSession is available when
  // share() is called — even on unmatched routes (404, 403, etc.)
  () => import('../../user_management/http/middlewares/silent_auth_middleware.js'),
  () => import('../middlewares/inertia_middleware.js'),
])

/**
 * The router middleware stack runs middleware on all the HTTP
 * requests with a registered route.
 */
router.use([
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/session/session_middleware'),
  () => import('@adonisjs/shield/shield_middleware'),
])

/**
 * Named middleware collection must be explicitly assigned to
 * the routes or the routes group.
 */
export const middleware = router.named({
  auth: () => import('../../user_management/http/middlewares/auth_middleware.js'),
  ensureApiSession: () =>
    import('../../user_management/http/middlewares/ensure_api_session_middleware.js'),
  guest: () => import('../../user_management/http/middlewares/guest_middleware.js'),
})

import type { AuthResult } from '../../domain/authentication.js'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    authSession?: AuthResult
  }
}

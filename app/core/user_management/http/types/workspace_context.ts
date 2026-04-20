import type { WorkspaceShareProps } from '../../application/workspace_provisioning.js'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    workspaceShare?: null | WorkspaceShareProps
  }
}

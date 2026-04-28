import { DevToolsEnvironmentService } from '#core/user_management/application/dev_tools_environment_service'
import app from '@adonisjs/core/services/app'

export async function ensureDevToolsEnabled(): Promise<void> {
  let service: DevToolsEnvironmentService

  try {
    service = await app.container.make(DevToolsEnvironmentService)
  } catch {
    service = new DevToolsEnvironmentService()
  }

  service.ensureEnabled()
}

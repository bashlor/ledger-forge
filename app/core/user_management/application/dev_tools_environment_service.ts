import { DomainError } from '#core/common/errors/domain_error'
import { isDevToolsRuntimeEnabled } from '#core/user_management/support/dev_tools_runtime'
import env from '#start/env'

export class DevToolsEnvironmentService {
  constructor(
    private readonly enabled: boolean = isDevToolsRuntimeEnabled({
      enabled: env.get('DEV_TOOLS_ENABLED', false),
      nodeEnv: env.get('NODE_ENV'),
    })
  ) {}

  ensureEnabled(): void {
    if (!this.enabled) {
      throw new DomainError('Development tools are not available in this environment.', 'forbidden')
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }
}

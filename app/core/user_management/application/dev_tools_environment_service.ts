import { DomainError } from '#core/common/errors/domain_error'
import { isDevelopmentEnvironment } from '#core/user_management/support/dev_operator'

export class DevToolsEnvironmentService {
  constructor(private readonly enabled: boolean = isDevelopmentEnvironment()) {}

  ensureEnabled(): void {
    if (!this.enabled) {
      throw new DomainError('Development tools are not available in this environment.', 'forbidden')
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }
}

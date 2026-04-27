import { DomainError } from '#core/common/errors/domain_error'
import { isDemoCommandAccessEnabled } from '#core/user_management/support/demo_command_access'

export class DemoCommandGuardService {
  constructor(private readonly enabled: boolean = isDemoCommandAccessEnabled()) {}

  ensureTenantAllowed(): void {
    if (!this.enabled) {
      throw new DomainError('Demo commands are not available in this environment.', 'forbidden')
    }
  }
}

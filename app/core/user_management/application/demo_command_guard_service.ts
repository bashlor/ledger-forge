import { DomainError } from '#core/common/errors/domain_error'
import {
  isDemoCommandAccessEnabled,
  parseDemoAllowedTenantIds,
} from '#core/user_management/support/demo_command_access'

export class DemoCommandGuardService {
  constructor(
    private readonly enabled: boolean = isDemoCommandAccessEnabled(),
    private readonly allowedTenantIds: string[] = parseDemoAllowedTenantIds()
  ) {}

  ensureTenantAllowed(tenantId: string): void {
    if (!this.enabled) {
      throw new DomainError('Demo commands are not available in this environment.', 'forbidden')
    }

    if (this.allowedTenantIds.length > 0 && !this.allowedTenantIds.includes(tenantId)) {
      throw new DomainError(`Tenant ${tenantId} is not allowlisted for demo commands.`, 'forbidden')
    }
  }
}

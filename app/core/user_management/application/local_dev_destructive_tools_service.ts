import { DomainError } from '#core/common/errors/domain_error'
import { isLocalDevDestructiveToolsEnabled } from '#core/user_management/support/local_dev_tools'

export class LocalDevDestructiveToolsService {
  constructor(private readonly enabled: boolean = isLocalDevDestructiveToolsEnabled()) {}

  ensureEnabled(): void {
    if (!this.enabled) {
      throw new DomainError(
        'Local destructive dev tools are not available in this environment.',
        'forbidden'
      )
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }
}

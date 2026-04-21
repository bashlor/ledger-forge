import { isDemoModeEnabled } from '#core/user_management/support/demo_mode'

export class DemoModeService {
  constructor(private readonly enabled: boolean = isDemoModeEnabled()) {}

  isEnabled(): boolean {
    return this.enabled
  }
}

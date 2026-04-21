import env from '#start/env'

export function isDemoModeEnabled(value = env.get('DEMO_MODE_ENABLED', false)): boolean {
  return value
}

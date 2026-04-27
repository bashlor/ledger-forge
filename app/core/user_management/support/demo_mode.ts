import env from '#start/env'

export function isAnonymousDemoAuthEnabled(
  input: {
    demoModeEnabled?: boolean
    nodeEnv?: 'development' | 'production' | 'test'
  } = {}
): boolean {
  const nodeEnv = input.nodeEnv ?? env.get('NODE_ENV')
  if (nodeEnv === 'test') {
    return true
  }

  return isDemoModeEnabled(input.demoModeEnabled)
}

export function isDemoModeEnabled(value = env.get('DEMO_MODE_ENABLED', false)): boolean {
  return value
}

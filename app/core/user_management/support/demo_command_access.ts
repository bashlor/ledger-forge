import env from '#start/env'

export function isDemoCommandAccessEnabled(
  input: {
    commandsEnabled?: boolean
    nodeEnv?: 'development' | 'production' | 'test'
  } = {}
): boolean {
  const nodeEnv = input.nodeEnv ?? env.get('NODE_ENV')
  const commandsEnabled = input.commandsEnabled ?? env.get('DEMO_COMMANDS_ENABLED', false)

  if (nodeEnv === 'production') {
    return false
  }

  if (nodeEnv === 'test') {
    return true
  }

  return commandsEnabled
}

export function parseDemoAllowedTenantIds(
  value = env.get('DEMO_ALLOWED_TENANT_IDS') ?? ''
): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

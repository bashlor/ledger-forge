import env from '#start/env'

export function isLocalDevDestructiveToolsEnabled(
  input: {
    enabled?: boolean
    nodeEnv?: 'development' | 'production' | 'test'
  } = {}
): boolean {
  const nodeEnv = input.nodeEnv ?? env.get('NODE_ENV')
  const enabled = input.enabled ?? env.get('DEV_TOOLS_LOCAL_ENABLED', false)

  if (nodeEnv !== 'development') {
    return false
  }

  return enabled
}

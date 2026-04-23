import env from '#start/env'

export function isLocalDevDestructiveToolsEnabled(
  input: {
    enabled?: boolean
    nodeEnv?: 'development' | 'production' | 'test'
  } = {}
): boolean {
  const nodeEnv = input.nodeEnv ?? env.get('NODE_ENV')
  const enabled = input.enabled ?? readDestructiveDevToolsFlag()

  if (nodeEnv !== 'development') {
    return false
  }

  return enabled
}

function readDestructiveDevToolsFlag(): boolean {
  return (
    env.get('DEV_TOOLS_DESTRUCTIVE_OPERATIONS_ENABLED') ?? env.get('DEV_TOOLS_LOCAL_ENABLED', false)
  )
}

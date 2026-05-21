export function isDevToolsRuntimeEnabled(
  input: {
    enabled?: boolean
    nodeEnv?: 'development' | 'production' | 'test'
  } = {}
): boolean {
  const nodeEnv =
    input.nodeEnv ??
    (process.env.NODE_ENV as 'development' | 'production' | 'test' | undefined) ??
    'production'
  const enabled = input.enabled ?? parseBooleanEnv(process.env.DEV_TOOLS_ENABLED) ?? false

  if (nodeEnv === 'production') {
    const appUrl = process.env.APP_URL ?? ''
    const isLocalProd = appUrl.includes('localhost') || appUrl.includes('127.0.0.1')
    if (!isLocalProd) {
      return false
    }
  } else if (nodeEnv !== 'development' && nodeEnv !== 'test') {
    return false
  }

  return enabled
}

function parseBooleanEnv(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return undefined
}

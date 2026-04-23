import env from '#start/env'

export interface DevOperatorBootstrapDefaults {
  email: string
  fullName: string
  password: string
}

export function isConfiguredDevOperator(
  publicId: null | string | undefined,
  devOperatorPublicIds = parseDevOperatorPublicIds()
): boolean {
  const normalizedPublicId = publicId?.trim()
  if (!normalizedPublicId) {
    return false
  }

  return devOperatorPublicIds.includes(normalizedPublicId)
}

export function isDevelopmentEnvironment(nodeEnv = env.get('NODE_ENV')): boolean {
  return nodeEnv === 'development'
}

export function isDevToolsRuntimeEnabled(
  nodeEnv = (process.env.NODE_ENV as 'development' | 'production' | 'test' | undefined) ??
    'production'
): boolean {
  return nodeEnv === 'development'
}

export function parseDevOperatorPublicIds(
  value = env.get('DEV_OPERATOR_PUBLIC_IDS') ?? ''
): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

export function readDevOperatorBootstrapDefaults(): DevOperatorBootstrapDefaults {
  return {
    email: (env.get('DEV_OPERATOR_DEFAULT_EMAIL') ?? 'dev-operator@example.local').trim(),
    fullName: (env.get('DEV_OPERATOR_DEFAULT_NAME') ?? 'Dev Operator').trim(),
    password: env.get('DEV_OPERATOR_DEFAULT_PASSWORD') ?? 'DevOperator123!',
  }
}

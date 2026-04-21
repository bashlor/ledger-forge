import env from '#start/env'

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

export function parseDevOperatorPublicIds(
  value = env.get('DEV_OPERATOR_PUBLIC_IDS') ?? ''
): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

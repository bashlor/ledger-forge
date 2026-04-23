import env from '#start/env'

export interface DevOperatorBootstrapDefaults {
  email: string
  fullName: string
  password: string
}

export function isDevelopmentEnvironment(nodeEnv = env.get('NODE_ENV')): boolean {
  return nodeEnv === 'development'
}

export function readDevOperatorBootstrapDefaults(): DevOperatorBootstrapDefaults {
  return {
    email: (env.get('DEV_OPERATOR_DEFAULT_EMAIL') ?? 'dev-operator@example.local').trim(),
    fullName: (env.get('DEV_OPERATOR_DEFAULT_NAME') ?? 'Dev Operator').trim(),
    password: env.get('DEV_OPERATOR_DEFAULT_PASSWORD') ?? 'DevOperator123!',
  }
}

import env from '#start/env'

export function isAnonymousDemoAuthEnabled(
  input: {
    demoModeEnabled?: boolean
    demoProductionForce?: boolean
    nodeEnv?: 'development' | 'production' | 'test'
  } = {}
): boolean {
  const nodeEnv = input.nodeEnv ?? env.get('NODE_ENV')
  if (nodeEnv === 'test') {
    return true
  }

  return resolveEffectiveDemoMode({
    demoModeEnabled: input.demoModeEnabled,
    demoProductionForce: input.demoProductionForce,
    nodeEnv,
  })
}

export function isDemoModeEnabled(
  demoModeEnabled?: boolean,
  input?: Pick<
    {
      demoModeEnabled?: boolean
      demoProductionForce?: boolean
      nodeEnv?: 'development' | 'production' | 'test'
    },
    'demoProductionForce' | 'nodeEnv'
  >
): boolean {
  return resolveEffectiveDemoMode({
    demoModeEnabled,
    demoProductionForce: input?.demoProductionForce,
    nodeEnv: input?.nodeEnv,
  })
}

function resolveEffectiveDemoMode(input: {
  demoModeEnabled?: boolean
  demoProductionForce?: boolean
  nodeEnv?: 'development' | 'production' | 'test'
}): boolean {
  const nodeEnv = input.nodeEnv ?? env.get('NODE_ENV')
  const demoFlag = input.demoModeEnabled ?? env.get('DEMO_MODE_ENABLED', false)
  const forceFlag = input.demoProductionForce ?? env.get('DEMO_PRODUCTION_FORCE', false)

  if (nodeEnv === 'production') {
    return demoFlag && forceFlag
  }
  return demoFlag
}

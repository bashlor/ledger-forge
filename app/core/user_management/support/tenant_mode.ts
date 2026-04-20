import env from '#core/common/start/env'

/**
 * Returns the static organization ID used in single-tenant mode.
 * Throws when `SINGLE_TENANT_ORG_ID` is not set.
 */
export function getSingleTenantOrgId(): string {
  const singleTenantOrgId = env.get('SINGLE_TENANT_ORG_ID')
  if (!singleTenantOrgId) {
    throw new Error('SINGLE_TENANT_ORG_ID must be set when TENANT_MODE=single')
  }
  return singleTenantOrgId
}

/**
 * Returns true when the application is running in single-tenant mode.
 * Controlled by the `TENANT_MODE` environment variable (default: 'multi').
 */
export function isSingleTenantMode(): boolean {
  return readTenantMode() === 'single'
}

function readTenantMode(): 'multi' | 'single' {
  const configuredMode = env.get('TENANT_MODE', 'multi')
  if (configuredMode === 'multi' || configuredMode === 'single') {
    return configuredMode
  }

  throw new Error(`TENANT_MODE must be either "multi" or "single". Received: ${configuredMode}`)
}

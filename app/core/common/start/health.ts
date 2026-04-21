import { AuditTrailCheck } from '#core/common/health_checks/audit_trail_check'
import { DrizzleCheck } from '#core/common/health_checks/drizzle_check'
import { HealthChecks } from '@adonisjs/core/health'

export const healthChecks = new HealthChecks().register([new DrizzleCheck(), new AuditTrailCheck()])

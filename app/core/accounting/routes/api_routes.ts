const HealthChecksController = () => import('#core/common/controllers/health_checks_controller')
import router from '@adonisjs/core/services/router'

router.get('/health/live', [HealthChecksController, 'live']).as('health.live')
// Re-introduce readiness later when RBAC / audit-trail work defines a safe contract.

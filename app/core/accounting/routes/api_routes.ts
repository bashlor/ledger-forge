const HealthChecksController = () => import('#core/common/controllers/health_checks_controller')
import router from '@adonisjs/core/services/router'

router.get('/health/live', [HealthChecksController, 'live']).as('health.live')
router.get('/health/ready', [HealthChecksController, 'ready']).as('health.ready')

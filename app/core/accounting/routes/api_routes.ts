const HealthChecksController = () => import('#core/common/controllers/health_checks_controller')
const V8ObservabilityController = () =>
  import('#core/common/controllers/v8_observability_controller')
import router from '@adonisjs/core/services/router'

router.get('/health/live', [HealthChecksController, 'live']).as('health.live')
router.get('/health/ready', [HealthChecksController, 'ready']).as('health.ready')

router.get('/health/v8', [V8ObservabilityController, 'index']).as('health.v8')
router.post('/health/v8/gc', [V8ObservabilityController, 'gc']).as('health.v8.gc')
router
  .post('/health/v8/heap-snapshot', [V8ObservabilityController, 'heapSnapshot'])
  .as('health.v8.heapSnapshot')
router
  .post('/health/v8/cpu-profile', [V8ObservabilityController, 'cpuProfile'])
  .as('health.v8.cpuProfile')

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const DevOperatorAccessController = () =>
  import('../http/controllers/dev_operator_access_controller.js')
const DevOperatorConsoleController = () =>
  import('../http/controllers/dev_operator_console_controller.js')

router
  .group(() => {
    router.get('/', [DevOperatorAccessController, 'show']).as('dev.root')
    router.get('/access', [DevOperatorAccessController, 'show']).as('dev.access')
    router.post('/access', [DevOperatorAccessController, 'store']).as('dev.access.store')
  })
  .prefix('/_dev')

router
  .group(() => {
    router.get('/inspector', [DevOperatorConsoleController, 'index']).as('dev.inspector')
    router
      .post('/inspector/active-tenant', [DevOperatorConsoleController, 'switchActiveTenant'])
      .as('dev.inspector.switch_tenant')
    router
      .post('/inspector/actions/:action', [DevOperatorConsoleController, 'runAction'])
      .as('dev.inspector.action')
  })
  .prefix('/_dev')
  .use([middleware.auth(), middleware.ensureActiveTenant()])

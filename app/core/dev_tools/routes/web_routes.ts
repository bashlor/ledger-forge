import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const DevOperatorConsoleController = () =>
  import('../http/controllers/dev_operator_console_controller.js')

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
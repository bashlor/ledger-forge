import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const ForgotPasswordController = () => import('../controllers/forgot_password_controller.js')
const AnonymousSigninController = () => import('../controllers/anonymous_signin_controller.js')
const MembershipController = () => import('../controllers/membership_controller.js')
const ResetPasswordController = () => import('../controllers/reset_password_controller.js')
const SigninController = () => import('../controllers/signin_controller.js')
const SignoutController = () => import('../controllers/signout_controller.js')
const SignupController = () => import('../controllers/signup_controller.js')
const UpdateAccountController = () => import('../controllers/update_account_controller.js')
const UpdatePasswordController = () => import('../controllers/update_password_controller.js')

router
  .group(() => {
    router.get('signup', [SignupController, 'show']).as('signup.show')
    router.post('signup', [SignupController, 'store']).as('signup.store')

    router.get('signin', [SigninController, 'show']).as('signin.show')
    router.post('signin', [SigninController, 'store']).as('signin.store')
    router.post('signin/anonymous', [AnonymousSigninController, 'store']).as('signin.anonymous')

    router.get('forgot-password', [ForgotPasswordController, 'show']).as('forgot_password.show')
    router.post('forgot-password', [ForgotPasswordController, 'store']).as('forgot_password.store')

    router.get('reset-password', [ResetPasswordController, 'show']).as('reset_password.show')
    router.post('reset-password', [ResetPasswordController, 'store']).as('reset_password.store')
  })
  .use(middleware.guest())

router
  .group(() => {
    router.post('signout', [SignoutController, 'store']).as('signout.store')

    router.get('account', [UpdateAccountController, 'show']).as('account.show')
    router.post('account', [UpdateAccountController, 'store']).as('account.store')
    router
      .post('account/password', [UpdatePasswordController, 'store'])
      .as('account.password.update')
  })
  .use(middleware.auth())

router
  .group(() => {
    router.get('account/organizations/members', [MembershipController, 'index']).as('members.index')
    router
      .patch('account/organizations/members/:memberId', [MembershipController, 'toggleActive'])
      .as('members.toggle_active')
    router
      .patch('account/organizations/members/:memberId/role', [MembershipController, 'updateRole'])
      .as('members.update_role')
  })
  .use([middleware.auth(), middleware.ensureActiveTenant()])

import type { ReactElement } from 'react'

import { Form, Link } from '@adonisjs/inertia/react'
import { type Data } from '@generated/data'
import { usePage } from '@inertiajs/react'
import { useEffect } from 'react'
import { toast, Toaster } from 'sonner'

export default function Layout({ children }: { children: ReactElement }) {
  const page = usePage<Data.SharedProps>()
  const props = page.props
  const notification = props.flash?.notification

  useEffect(() => {
    toast.dismiss()
    if (notification?.type === 'error') toast.error(notification.message)
    if (notification?.type === 'success') toast.success(notification.message)
  }, [page.url, notification])

  return (
    <>
      <header>
        <div>
          <div>
            <Link route="landing">
              <svg
                fill="none"
                height="24"
                viewBox="0 0 195 38"
                width="120"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M180 37.5v-30h-7.5V0H195v7.5h-7.5v30H180ZM150 15V7.5h-15V0h15v7.5h7.5V15H150Zm-15 22.5V30h-7.5V7.5h7.5V30h15v7.5h-15Zm15-7.5v-7.5h7.5V30H150ZM82.5 37.5v-30H90V0h15v7.5h7.5v30H105v-15H90v15h-7.5ZM90 15h15V7.8H90V15ZM45 37.5V0h22.5v7.5h-15V15h15v7.5h-15V30h15v7.5H45ZM0 37.5V0h22.5v7.5H30V15h-7.5v15H30v7.5h-7.5V30H15v-7.5H7.5v15H0ZM7.5 15h14.7V7.5H7.5V15Z"
                  fill="currentColor"
                />
              </svg>
            </Link>
          </div>
          <div>
            <nav>
              {props.user ? (
                <>
                  <Link route="account.show">{props.user.initials}</Link>
                  <Form route="signout.store">
                    <button type="submit"> Logout </button>
                  </Form>
                </>
              ) : (
                <>
                  <Link route="signup.show">Signup</Link>
                  <Link route="signin.show">Login</Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <Toaster position="top-center" richColors />
    </>
  )
}

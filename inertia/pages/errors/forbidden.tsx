import { ErrorHomeLink } from './error_home_link'

export default function Forbidden() {
  return (
    <div className="error-page">
      <p className="error-code">403</p>
      <h1>Access denied</h1>
      <p>You don't have permission to access this page.</p>
      <ErrorHomeLink />
    </div>
  )
}

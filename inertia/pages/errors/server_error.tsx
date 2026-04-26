import { ErrorHomeLink } from './error_home_link'

export default function ServerError() {
  return (
    <div className="error-page">
      <p className="error-code">500</p>
      <h1>Something went wrong</h1>
      <p>An unexpected error occurred. Please try again later.</p>
      <ErrorHomeLink />
    </div>
  )
}

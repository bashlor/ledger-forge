import { ErrorPageShell } from './error_page_shell'

export default function ServerError() {
  return (
    <ErrorPageShell
      code="500"
      description="An unexpected server error interrupted this request. Try again from a stable workspace page."
      icon="notifications"
      title="Something went wrong"
    />
  )
}

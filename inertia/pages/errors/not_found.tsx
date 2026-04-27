import { ErrorPageShell } from './error_page_shell'

export default function NotFound() {
  return (
    <ErrorPageShell
      code="404"
      description="The page you are looking for does not exist, was moved, or is outside your current workspace."
      icon="receipt_long"
      title="Page not found"
    />
  )
}

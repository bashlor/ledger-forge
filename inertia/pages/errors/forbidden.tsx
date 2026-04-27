import { ErrorPageShell } from './error_page_shell'

export default function Forbidden() {
  return (
    <ErrorPageShell
      code="403"
      description="Your current account does not have permission to open this area."
      icon="shield_lock"
      title="Access denied"
    />
  )
}

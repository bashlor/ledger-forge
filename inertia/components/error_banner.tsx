interface ErrorBannerProps {
  message: string
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  if (!message) {
    return null
  }

  return (
    <div
      className="rounded-lg bg-error-container/35 px-4 py-3 text-sm font-medium text-error"
      role="alert"
    >
      {message}
    </div>
  )
}

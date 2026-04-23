interface EmptyStateProps {
  message: string
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="px-4 py-8">
      <div className="rounded-lg border border-dashed border-outline-variant/35 bg-surface-container-low px-4 py-5 text-sm text-on-surface-variant">
        {message}
      </div>
    </div>
  )
}

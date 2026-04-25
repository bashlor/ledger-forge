import type { ReactNode } from 'react'

interface PanelProps {
  as?: 'article' | 'div' | 'section'
  children: ReactNode
  className?: string
}

export function Panel({ as = 'section', children, className }: PanelProps) {
  const classes = `panel-elevated ${className ?? ''}`.trim()

  if (as === 'article') return <article className={classes}>{children}</article>
  if (as === 'div') return <div className={classes}>{children}</div>
  return <section className={classes}>{children}</section>
}

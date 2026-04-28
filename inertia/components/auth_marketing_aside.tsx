import { AppIcon } from '~/components/app_icon'

export interface AuthMarketingPoint {
  icon: string
  text: string
}

interface AuthMarketingAsideProps {
  description: string
  eyebrow: string
  headline: string
  points: AuthMarketingPoint[]
}

export function AuthMarketingAside({
  description,
  eyebrow,
  headline,
  points,
}: AuthMarketingAsideProps) {
  return (
    <div className="flex max-w-md flex-col gap-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/90">
        {eyebrow}
      </p>
      <div className="space-y-3">
        <h2 className="font-headline text-3xl font-bold tracking-tight text-on-surface lg:text-4xl">
          {headline}
        </h2>
        <p className="text-base leading-relaxed text-on-surface-variant">{description}</p>
      </div>
      <ul className="space-y-4">
        {points.map((p) => (
          <li className="flex gap-3 text-sm leading-snug text-on-surface-variant" key={p.text}>
            <span className="mt-0.5 shrink-0 text-primary">
              <AppIcon aria-hidden name={p.icon} size={18} />
            </span>
            <span>{p.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

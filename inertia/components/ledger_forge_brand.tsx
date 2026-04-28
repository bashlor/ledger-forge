import { AppIcon } from './app_icon'

export const LEDGER_FORGE_LOGO_ICON = 'account_balance_wallet'

interface LedgerForgeMarkProps {
  className?: string
  size?: number
}

export function LedgerForgeMark({ className = 'text-primary', size = 20 }: LedgerForgeMarkProps) {
  return <AppIcon className={className} filled name={LEDGER_FORGE_LOGO_ICON} size={size} />
}

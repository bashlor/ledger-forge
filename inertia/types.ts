import { type Data } from '@generated/data'

export type FormErrors = Record<string, string>

export type InertiaProps<T = Record<string, never>> = Data.SharedProps & T

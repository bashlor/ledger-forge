type CentsAggregateValue = bigint | null | number | string | undefined

/**
 * Converts integer cents to a decimal amount (major currency unit, e.g. euros).
 */
export function fromCents(amountCents: number): number {
  return amountCents / 100
}

/**
 * Converts a decimal amount (in major currency unit, e.g. euros) to integer cents.
 *
 * Using `+ Number.EPSILON` before rounding neutralises the binary floating-point
 * representation drift that causes `Math.round(1.005 * 100)` to return 100
 * instead of the correct 101.
 *
 * @example
 * toCents(1.005)  // → 101
 * toCents(42.5)   // → 4250
 * toCents(99.99)  // → 9999
 */
export function toCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100)
}

/**
 * Converts database aggregate cents to a JS number while preserving cent precision.
 *
 * PostgreSQL aggregate functions can return wider values than the source integer column
 * (often as string/bigint through drivers). Keep this boundary explicit so oversized
 * totals fail loudly instead of silently losing cents past Number.MAX_SAFE_INTEGER.
 */
export function toSafeCentsNumber(value: CentsAggregateValue, label = 'amountCents'): number {
  if (value === null || value === undefined) {
    return 0
  }

  if (typeof value === 'bigint') {
    if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
      throw new RangeError(`${label} exceeds JavaScript safe integer range.`)
    }

    return Number(value)
  }

  if (typeof value === 'number') {
    assertSafeIntegerCents(value, label)
    return value
  }

  const normalized = value.trim()
  if (!/^-?\d+$/.test(normalized)) {
    throw new TypeError(`${label} must be an integer cents value.`)
  }

  const asBigInt = BigInt(normalized)
  if (asBigInt > BigInt(Number.MAX_SAFE_INTEGER) || asBigInt < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new RangeError(`${label} exceeds JavaScript safe integer range.`)
  }

  return Number(asBigInt)
}

function assertSafeIntegerCents(value: number, label: string): void {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new TypeError(`${label} must be an integer cents value.`)
  }

  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} exceeds JavaScript safe integer range.`)
  }
}

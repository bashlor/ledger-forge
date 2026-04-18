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

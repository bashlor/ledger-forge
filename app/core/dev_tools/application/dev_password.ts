import { randomBytes } from 'node:crypto'

const DEFAULT_DEV_PASSWORD_BYTE_LENGTH = 18

/**
 * Generates a random password for local dev, load tests, and demo scenarios.
 * Not for production credentials.
 */
export function generateDevPassword(byteLength = DEFAULT_DEV_PASSWORD_BYTE_LENGTH): string {
  return randomBytes(byteLength).toString('base64url')
}

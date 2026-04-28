#!/usr/bin/env node

import { readFileSync } from 'node:fs'

const reportFile = process.argv[2]

if (!reportFile) {
  console.error('Missing NDJSON report file path.')
  process.exit(1)
}

const lines = readFileSync(reportFile, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)

const events = lines.flatMap((line) => {
  try {
    return [JSON.parse(line)]
  } catch {
    return []
  }
})
const testEvents = events.filter((event) => event.event === 'test:end')
const failedTests = testEvents.filter(
  (event) => event.failReason || (Array.isArray(event.errors) && event.errors.length > 0)
)
const skippedTests = testEvents.filter((event) => event.isSkipped)
const summary =
  events.findLast(
    (event) => Object.hasOwn(event, 'aggregates') && Object.hasOwn(event, 'hasError')
  ) ?? null

console.log('E2E report summary:')
console.log(`  Tests: ${testEvents.length}`)
console.log(`  Failed: ${failedTests.length}`)
console.log(`  Skipped: ${skippedTests.length}`)

if (summary?.duration !== undefined) {
  console.log(`  Duration: ${summary.duration}ms`)
}

if (failedTests.length > 0) {
  console.log('  Failures:')
  for (const event of failedTests) {
    const title =
      typeof event.title === 'string'
        ? event.title
        : (event.title?.expanded ?? event.title?.original)
    console.log(`    - ${title}`)
  }
}

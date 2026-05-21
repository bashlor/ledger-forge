import { test } from '@japa/runner'

test.group('V8 observability routes', () => {
  test('GET /health/v8 returns comprehensive V8 and process statistics', async ({ client }) => {
    const response = await client.get('/health/v8')
    response.assertStatus(200)
    response.assertBodyContains({
      eventLoop: {
        latencyMs: {},
      },
      meta: {
        nodeVersion: process.version,
      },
      process: {
        handles: {},
        memory: {},
      },
      v8: {
        code: {},
        heap: {},
      },
    })
  })

  test('POST /health/v8/gc triggers garbage collection successfully', async ({ client }) => {
    const response = await client.post('/health/v8/gc')

    if (typeof global.gc !== 'function') {
      // If GC is not exposed in this test process, expect a 400 with a clear message
      response.assertStatus(400)
      response.assertBodyContains({ error: 'GC Expose Disabled' })
    } else {
      // If GC is exposed, expect a successful response
      response.assertStatus(200)
      response.assertBodyContains({
        message: 'Garbage collection triggered successfully',
        status: 'success',
      })
    }
  })

  test('POST /health/v8/heap-snapshot generates heapsnapshot file and returns path', async ({
    client,
  }) => {
    const response = await client.post('/health/v8/heap-snapshot')
    response.assertStatus(200)
    response.assertBodyContains({
      message: 'Heap snapshot generated successfully',
      status: 'success',
    })

    const body = response.body() as any
    const filePath = body?.data?.filePath

    // Clean up the created snapshot file to avoid bloating the disk during tests
    const fs = await import('node:fs')
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  })

  test('POST /health/v8/cpu-profile records a CPU profile successfully', async ({ client }) => {
    // Request a very short duration (50ms) to keep unit tests fast
    const response = await client.post('/health/v8/cpu-profile').json({ duration: 50 })
    response.assertStatus(200)
    response.assertBodyContains({ status: 'success' })

    const body = response.body() as any
    const filePath = body?.data?.filePath

    // Clean up the created profile file
    const fs = await import('node:fs')
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  })
})

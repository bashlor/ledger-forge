import { test } from '@japa/runner'

test.group('Health routes', () => {
  test('GET /health/live returns a minimal liveness payload', async ({ client }) => {
    const response = await client.get('/health/live')

    response.assertStatus(200)
    response.assertBodyContains({ status: 'ok' })
  })

  test('GET /health/ready is not exposed', async ({ client }) => {
    const response = await client.get('/health/ready')

    response.assertStatus(404)
  })
})

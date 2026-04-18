export async function expectRejects(assert: any, callback: () => Promise<unknown>) {
  let didThrow = false

  try {
    await callback()
  } catch {
    didThrow = true
  }

  assert.isTrue(didThrow)
}

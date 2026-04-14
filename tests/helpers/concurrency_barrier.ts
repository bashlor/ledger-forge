export class ConcurrencyBarrier {
  private count = 0
  private readonly gate: Promise<void>
  private releaseGate!: () => void

  constructor(private readonly target: number) {
    if (target < 2) {
      throw new Error('ConcurrencyBarrier requires a target >= 2.')
    }

    this.gate = new Promise<void>((resolve) => {
      this.releaseGate = resolve
    })
  }

  async wait(): Promise<void> {
    this.count += 1
    if (this.count === this.target) {
      this.releaseGate()
    }
    await this.gate
  }
}

export async function runSimultaneously<T>(
  operations: Array<(waitAtBarrier: () => Promise<void>) => Promise<T>>
): Promise<PromiseSettledResult<T>[]> {
  // All operations receive the same barrier waiter to align their critical-point execution.
  const barrier = new ConcurrencyBarrier(operations.length)
  return Promise.allSettled(operations.map((operation) => operation(() => barrier.wait())))
}

export class SlidingWindowRateLimiter {
  private readonly timestamps: number[] = [];

  constructor(
    private readonly limit: number,
    private readonly intervalMs: number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  async acquire(): Promise<void> {
    while (true) {
      const currentTime = this.now();
      this.drain(currentTime);

      if (this.timestamps.length < this.limit) {
        this.timestamps.push(currentTime);
        return;
      }

      const oldest = this.timestamps[0];
      const waitMs = Math.max(this.intervalMs - (currentTime - oldest), 5);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  private drain(currentTime: number) {
    while (this.timestamps.length > 0 && currentTime - this.timestamps[0] >= this.intervalMs) {
      this.timestamps.shift();
    }
  }
}

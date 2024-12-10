// Abstract base class for all routine jobs
export abstract class RoutineJob {
  protected name: string;
  protected intervalMs: number;
  protected lastRun: Date | null;

  constructor(name: string, intervalMs: number) {
    this.name = name;
    this.intervalMs = intervalMs;
    this.lastRun = null;
  }

  // Abstract method that each routine must implement
  abstract execute(): Promise<void>;

  shouldRun(): boolean {
    if (!this.lastRun) return true;

    const elapsed = Date.now() - this.lastRun.getTime();
    return elapsed >= this.intervalMs;
  }

  getName(): string {
    return this.name;
  }
}

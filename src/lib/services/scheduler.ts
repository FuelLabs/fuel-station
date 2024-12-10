import type { RoutineJob } from './routine';

// Main scheduler service
export class SchedulerService {
  private routines: RoutineJob[] = [];
  private isRunning = false;
  private intervalId?: NodeJS.Timer;

  addRoutine(routine: RoutineJob): void {
    this.routines.push(routine);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Scheduler is already running');
    }

    this.isRunning = true;

    // Use setInterval for continuous checking
    this.intervalId = setInterval(async () => {
      await this.checkAndExecuteRoutines();
    }, 1000); // Check every second
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.isRunning = false;
  }

  private async checkAndExecuteRoutines(): Promise<void> {
    const runningRoutines = this.routines
      .filter((routine) => routine.shouldRun())
      .map((routine) => routine.execute());

    if (runningRoutines.length > 0) {
      try {
        await Promise.all(runningRoutines);
      } catch (error) {
        console.error('Error executing routines:', error);
      }
    }
  }
}

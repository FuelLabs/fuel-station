import type { FuelStationDatabase } from '../db/database';
import { RoutineJob, type SupabaseDB } from '../index';

export class AccountsUnlockManager extends RoutineJob {
  private database: FuelStationDatabase;
  constructor({
    database,
    name,
    intervalMs,
  }: {
    database: FuelStationDatabase;
    name: string;
    intervalMs: number;
  }) {
    super(name, intervalMs);

    this.database = database;
  }

  async execute() {
    this.lastRun = new Date();

    console.log('executing routine: ', this.name);

    const lockedAccounts = await this.database.getLockedAccounts();

    for (const account of lockedAccounts) {
      const { account: accountData, error: accountError } =
        await this.database.getAccount(account);

      if (accountError) {
        console.error(accountError);
        continue;
      }

      if (accountData.expiry && new Date(accountData.expiry) < new Date()) {
        console.log(`Unlocking account ${account}`);
        await this.database.unlockAccount(account);
      }
    }
  }
}

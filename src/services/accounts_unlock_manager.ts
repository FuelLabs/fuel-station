import { RoutineJob, type SupabaseDB } from '../lib/index';

export class AccountsUnlockManager extends RoutineJob {
  private supabaseDB: SupabaseDB;
  constructor({
    supabaseDB,
    name,
    intervalMs,
  }: {
    supabaseDB: SupabaseDB;
    name: string;
    intervalMs: number;
  }) {
    super(name, intervalMs);

    this.supabaseDB = supabaseDB;
  }

  async execute() {
    this.lastRun = new Date();

    console.log('executing routine: ', this.name);

    const lockedAccounts = await this.supabaseDB.getLockedAccounts();

    for (const account of lockedAccounts) {
      const { account: accountData, error: accountError } =
        await this.supabaseDB.getAccount(account);

      if (accountError) {
        console.error(accountError);
        continue;
      }

      if (accountData.expiry && new Date(accountData.expiry) < new Date()) {
        console.log(`Unlocking account ${account}`);
        await this.supabaseDB.unlockAccount(account);
      }
    }
  }
}

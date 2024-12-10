import {
  RoutineJob,
  type EnvConfig,
  type FuelClient,
  type SupabaseDB,
} from '../lib/index';

export class AccountsUnlockManager extends RoutineJob {
  private supabaseDB: SupabaseDB;
  private fuelClient: FuelClient;
  private env: EnvConfig;
  constructor({
    supabaseDB,
    fuelClient,
    name,
    intervalMs,
    env,
  }: {
    supabaseDB: SupabaseDB;
    fuelClient: FuelClient;
    name: string;
    intervalMs: number;
    env: EnvConfig;
  }) {
    super(name, intervalMs);

    this.supabaseDB = supabaseDB;
    this.fuelClient = fuelClient;
    this.env = env;
  }

  async execute() {
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

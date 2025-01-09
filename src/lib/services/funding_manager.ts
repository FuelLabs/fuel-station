import { sleep } from 'bun';
import type { EnvConfig, FuelClient, SupabaseDB } from '..';
import { RoutineJob } from './routine';

/// This routine checks for all accounts that are not funded and funds them
export class FundingManager extends RoutineJob {
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

  async execute(): Promise<void> {
    this.lastRun = new Date();

    console.log('executing routine: ', this.name);

    // We first fetch all accounts which need funding
    const accountsThatNeedFunding =
      await this.supabaseDB.getAccountsThatNeedFunding();

    for (const walletAddress of accountsThatNeedFunding) {
      const coin = await this.fuelClient.getCoin(
        walletAddress,
        this.env.MINIMUM_COIN_VALUE
      );

      if (!coin) {
        console.log(`coin not found for ${walletAddress}, funding ...`);

        await this.fuelClient.fundAccount(
          walletAddress,
          this.env.FUNDING_AMOUNT
        );

        console.log(
          `Funded ${walletAddress} with ${this.env.FUNDING_AMOUNT} coins`
        );

        // 200ms
        await sleep(200);
      }

      await this.supabaseDB.setAccountNeedsFunding(walletAddress, false);
    }
  }
}

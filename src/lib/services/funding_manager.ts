import { sleep } from 'bun';
import type { EnvConfig, FuelClient, SupabaseDB } from '..';
import { RoutineJob } from './routine';
import type { Database } from '../db/database';

/// This routine checks for all accounts that are not funded and funds them
export class FundingManager extends RoutineJob {
  private database: Database;
  private fuelClient: FuelClient;
  private env: EnvConfig;
  constructor({
    database,
    fuelClient,
    name,
    intervalMs,
    env,
  }: {
    database: Database;
    fuelClient: FuelClient;
    name: string;
    intervalMs: number;
    env: EnvConfig;
  }) {
    super(name, intervalMs);

    this.database = database;
    this.fuelClient = fuelClient;
    this.env = env;
  }

  async execute(): Promise<void> {
    this.lastRun = new Date();

    console.log('executing routine: ', this.name);

    // We first fetch all accounts which need funding
    const accountsThatNeedFunding =
      await this.database.getAccountsThatNeedFunding();

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

      await this.database.setAccountNeedsFunding(walletAddress, false);
    }
  }
}

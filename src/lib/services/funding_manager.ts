import { sleep } from 'bun';
import type { FuelClient } from '..';
import { RoutineJob } from './routine';
import type { FuelStationDatabase } from '../db/database';

/// This routine checks for all accounts that are not funded and funds them
export class FundingManager extends RoutineJob {
  private database: FuelStationDatabase;
  private fuelClient: FuelClient;
  private minimumCoinValue: number;
  private fundingAmount: number;

  constructor({
    database,
    fuelClient,
    name,
    intervalMs,
    minimumCoinValue,
    fundingAmount,
  }: {
    database: FuelStationDatabase;
    fuelClient: FuelClient;
    name: string;
    intervalMs: number;
    minimumCoinValue: number;
    fundingAmount: number;
  }) {
    super(name, intervalMs);

    this.database = database;
    this.fuelClient = fuelClient;
    this.minimumCoinValue = minimumCoinValue;
    this.fundingAmount = fundingAmount;
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
        this.minimumCoinValue
      );

      if (!coin) {
        console.log(`coin not found for ${walletAddress}, funding ...`);

        await this.fuelClient.fundAccount(walletAddress, this.fundingAmount);

        console.log(`Funded ${walletAddress} with ${this.fundingAmount} coins`);

        // 200ms
        await sleep(200);
      }

      await this.database.setAccountNeedsFunding(walletAddress, false);
    }
  }
}

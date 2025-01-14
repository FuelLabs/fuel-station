import type { FuelClient } from '../fuel';
import { AccountsUnlockManager } from './accounts_unlock_manager';
import { FundingManager } from './funding_manager';
import { SchedulerService } from './scheduler';
import { SmallCoinsManager } from './small_coins_manager';
import type { FuelStationDatabase } from '../db/database';
import type { WalletUnlocked } from 'fuels';

export type SchedulerConfig = {
  database: FuelStationDatabase;
  fuelClient: FuelClient;
  funderWallet: WalletUnlocked;
  minimumCoinValue: number;
  fundingAmount: number;
  accounts: WalletUnlocked[];
};

export const schedulerSetup = async ({
  database,
  fuelClient,
  funderWallet,
  minimumCoinValue,
  fundingAmount,
  accounts,
}: SchedulerConfig) => {
  // upsert all accounts to the database
  // we mark all accounts as needing funding so that the funding manager will fund them
  await database.upsertAccounts(
    accounts.map((account) => ({
      address: account.address.toB256(),
      isLocked: false,
      needsFunding: true,
    }))
  );

  const scheduler = new SchedulerService();

  scheduler.addRoutine(
    new AccountsUnlockManager({
      database,
      name: 'AccountsUnlockManager',
      // 5 seconds
      intervalMs: 5000,
    })
  );

  scheduler.addRoutine(
    new FundingManager({
      database,
      fuelClient,
      name: 'FundingManager',
      // 10 seconds
      intervalMs: 10000,
      minimumCoinValue,
      fundingAmount,
    })
  );

  scheduler.addRoutine(
    new SmallCoinsManager({
      fuelClient,
      name: 'SmallCoinsManager',
      // 1 hour
      intervalMs: 60 * 60 * 1000,
      funderWallet,
      minimumCoinValue,
      accounts,
    })
  );

  return scheduler;
};

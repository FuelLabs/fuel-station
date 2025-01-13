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
};

export const schedulerSetup = ({
  database,
  fuelClient,
  funderWallet,
  minimumCoinValue,
  fundingAmount,
}: SchedulerConfig) => {
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
    })
  );

  return scheduler;
};

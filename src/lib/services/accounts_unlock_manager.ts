import { bn, type Provider } from 'fuels';
import type { FuelStationDatabase } from '../db/database';
import { RoutineJob } from '../index';

export class AccountsUnlockManager extends RoutineJob {
  private database: FuelStationDatabase;
  private fuelProvider: Provider;

  constructor({
    database,
    name,
    intervalMs,
    fuelProvider,
  }: {
    database: FuelStationDatabase;
    name: string;
    intervalMs: number;
    fuelProvider: Provider;
  }) {
    super(name, intervalMs);

    this.database = database;
    this.fuelProvider = fuelProvider;
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

        const { job, error: jobError } =
          await this.database.getJobByAccount(account);

        if (jobError) {
          console.error(
            `Failed to get job for account ${account}: ${jobError}`
          );
          continue;
        }

        // TODO: check if this is even possible? i.e at this point there is no balance in the account
        const previousBalance =
          (await this.database.getBalance(job.token)) ?? bn(0);

        // TODO: we can extract a common function for this logic everywhere
        // check if the transaction didn't happen, if not then re-credit the account
        if (!job.txn_hash) {
          const newBalance = previousBalance.add(job.coin_value_consumed);
          const upsertBalanceError = await this.database.upsertBalance(
            job.token,
            newBalance
          );
          if (upsertBalanceError) {
            console.error(upsertBalanceError);
            continue;
          }
        } else {
          const txn = await this.fuelProvider.getTransaction(job.txn_hash);

          if (txn === null) {
            const newBalance = previousBalance.add(job.coin_value_consumed);
            const upsertBalanceError = await this.database.upsertBalance(
              job.token,
              newBalance
            );
            if (upsertBalanceError) {
              console.error(upsertBalanceError);
              continue;
            }
          }
        }

        const unlockError = await this.database.unlockAccount(account);
        if (unlockError) {
          console.error('Failed to unlock account', unlockError);
        }
      }
    }
  }
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { envSchema, FuelClient, SupabaseDB } from '../lib';
import { SchedulerService } from '../lib/services/scheduler';
import {
  AccountsUnlockManager,
  FundingManager,
  SmallCoinsManager,
} from '../services';
import type { Database } from '../types';
import { Provider, Wallet } from 'fuels';

const main = async () => {
  const scheduler = new SchedulerService();

  const env = envSchema.parse(process.env);

  const supabaseClient: SupabaseClient<Database> = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY
  );

  const supabaseDB = new SupabaseDB(supabaseClient);

  const fuelProvider = await Provider.create(env.FUEL_PROVIDER_URL);

  const fuelClient = new FuelClient({
    provider: fuelProvider,
    funderWallet: Wallet.fromPrivateKey(
      env.FUEL_FUNDER_PRIVATE_KEY,
      fuelProvider
    ),
    minimumCoinValue: env.MINIMUM_COIN_VALUE,
  });

  scheduler.addRoutine(
    new AccountsUnlockManager({
      supabaseDB,
      name: 'AccountsUnlockManager',
      // 5 seconds
      intervalMs: 5000,
    })
  );

  scheduler.addRoutine(
    new FundingManager({
      supabaseDB,
      fuelClient,
      name: 'FundingManager',
      // 10 seconds
      intervalMs: 10000,
      env,
    })
  );

  scheduler.addRoutine(
    new SmallCoinsManager({
      fuelClient,
      name: 'SmallCoinsManager',
      // 1 hour
      intervalMs: 60 * 60 * 1000,
      env,
    })
  );

  await scheduler.start();
};

main();

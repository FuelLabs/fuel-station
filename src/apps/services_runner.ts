import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { envSchema, FuelClient, SupabaseDB } from '../lib';
import { SchedulerService } from '../lib/services/scheduler';
import {
  AccountsUnlockManager,
  FundingManager,
  schedulerSetup,
  SmallCoinsManager,
} from '../lib/services';
import type { Database } from '../types';
import { Provider, Wallet } from 'fuels';

const main = async () => {
  const env = envSchema.parse(process.env);

  console.log('ENV', env.ENV);

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

  const scheduler = schedulerSetup({ database: supabaseDB, fuelClient, env });

  await scheduler.start();
};

main();

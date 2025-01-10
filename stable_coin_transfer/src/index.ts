import { createClient } from '@supabase/supabase-js';
import {
  envSchema,
  FuelClient,
  GasStationServer,
  schedulerSetup,
  SupabaseDB,
  type GasStationServerConfig,
} from '../../src/lib';
import { bn, Provider, Wallet } from 'fuels';

const main = async () => {
  const env = envSchema.parse(process.env);

  const supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const supabaseDB = new SupabaseDB(supabaseClient);
  const fuelProvider = await Provider.create(env.FUEL_PROVIDER_URL);
  const funderWallet = Wallet.fromPrivateKey(
    env.FUEL_FUNDER_PRIVATE_KEY,
    fuelProvider
  );

  const fuelClient = new FuelClient({
    provider: fuelProvider,
    funderWallet: funderWallet,
    minimumCoinValue: env.MINIMUM_COIN_VALUE,
  });

  const serverConfig: GasStationServerConfig = {
    port: 3000,
    database: new SupabaseDB(supabaseClient),
    fuelClient: fuelClient,
    funderWallet: funderWallet,
    isHttps: false,
    maxValuePerCoin: bn(1000),
  };

  const server = new GasStationServer(serverConfig);
  const scheduler = schedulerSetup({ database: supabaseDB, fuelClient, env });

  await server.start();
  await scheduler.start();
};

main();

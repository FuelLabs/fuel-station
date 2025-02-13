import { createClient } from '@supabase/supabase-js';
import {
  envSchema,
  FuelClient,
  GasStationServer,
  generateMnemonicWallets,
  schedulerSetup,
  SupabaseDB,
  type GasStationServerConfig,
} from '../../src/lib';
import { bn, Provider, Wallet } from 'fuels';

const main = async () => {
  const env = envSchema.parse(process.env);

  const supabaseClient = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  const database = new SupabaseDB(supabaseClient);

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

  const accounts = generateMnemonicWallets(
    env.FUEL_PAYMASTER_MNEMONIC,
    env.NUM_OF_ACCOUNTS,
    fuelProvider
  );

  const serverConfig: GasStationServerConfig = {
    port: 3000,
    database,
    fuelClient,
    funderWallet,
    accounts,
  };

  const server = new GasStationServer(serverConfig);
  const scheduler = await schedulerSetup({
    database,
    fuelClient,
    funderWallet,
    minimumCoinValue: env.MINIMUM_COIN_VALUE,
    fundingAmount: env.FUNDING_AMOUNT,
    accounts,
  });

  await server.start();
  await scheduler.start();
};

main();

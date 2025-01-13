import { expect, test, describe, afterAll } from 'bun:test';
import type { GasStationServerConfig } from '../src/lib/server';
import {
  envSchema,
  FuelClient,
  GasStationServer,
  generateMnemonicWallets,
  schedulerSetup,
  SupabaseDB,
} from '../src/lib';
import { createClient } from '@supabase/supabase-js';
import { bn, Provider, ScriptTransactionRequest, Wallet } from 'fuels';
import { GasStationClient } from '../src/lib/client';

describe('client', async () => {
  const maxValuePerCoin = bn(10000);

  const env = envSchema.parse(process.env);
  const supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const supabaseDB = new SupabaseDB(supabaseClient);
  const fuelProvider = await Provider.create(env.FUEL_PROVIDER_URL);
  const funderWallet = Wallet.fromPrivateKey(env.FUEL_FUNDER_PRIVATE_KEY);

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
    database: new SupabaseDB(supabaseClient),
    fuelClient: fuelClient,
    funderWallet: funderWallet,
    isHttps: false,
    maxValuePerCoin,
    accounts,
  };

  const server = new GasStationServer(serverConfig);
  const scheduler = await schedulerSetup({
    database: supabaseDB,
    fuelClient,
    funderWallet,
    minimumCoinValue: env.MINIMUM_COIN_VALUE,
    fundingAmount: env.FUNDING_AMOUNT,
    accounts,
  });

  await server.start();
  await scheduler.start();

  afterAll(async () => {
    await server.stop();
    scheduler.stop();
  });

  test('prepare gasless transaction', async () => {
    const client = new GasStationClient(
      `http://localhost:${serverConfig.port}`,
      fuelProvider
    );

    const transaction = new ScriptTransactionRequest();
    const gaslessTransaction =
      await client.prepareGaslessTransaction(transaction);

    expect(gaslessTransaction).toBeDefined();

    console.log('gaslessTransaction', gaslessTransaction);
  });
});

import { expect, test, describe, afterAll } from 'bun:test';
import type { GasStationServerConfig } from '../src/lib/server';
import {
  AllocateCoinResponseSchema,
  envSchema,
  FuelClient,
  GasStationServer,
  generateMnemonicWallets,
  schedulerSetup,
  SupabaseDB,
} from '../src/lib';
import { createClient } from '@supabase/supabase-js';
import {
  Address,
  bn,
  Provider,
  ScriptTransactionRequest,
  Wallet,
  type Coin,
} from 'fuels';
import axios from 'axios';

describe('server', async () => {
  const maxValuePerCoin = bn(10000);

  const env = envSchema.parse(process.env);
  const supabaseClient = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );
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

  const accounts = generateMnemonicWallets(
    env.FUEL_PAYMASTER_MNEMONIC,
    env.NUM_OF_ACCOUNTS,
    fuelProvider
  );

  const serverConfig: GasStationServerConfig = {
    port: 3000,
    database: supabaseDB,
    fuelClient: fuelClient,
    funderWallet: funderWallet,
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

  test('should return healthy', async () => {
    const response = await axios.get(
      `http://localhost:${serverConfig.port}/health`
    );

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ status: 'healthy' });
  });

  test('should return metadata', async () => {
    const response = await axios.get(
      `http://localhost:${serverConfig.port}/metadata`
    );

    expect(response.status).toBe(200);
    expect(bn(response.data.maxValuePerCoin)).toEqual(maxValuePerCoin);
  });

  test(
    'should return an allocated coin',
    async () => {
      const { status, data } = await axios.post(
        `http://localhost:${serverConfig.port}/allocate-coin`
      );

      expect(status).toBe(200);

      const { success } = AllocateCoinResponseSchema.safeParse(data);
      expect(success).toBe(true);
    },
    { timeout: 20 * 1000 }
  );

  afterAll(async () => {
    await server.stop();
    scheduler.stop();
  });

  test('should get signed message', async () => {
    const { data: AllocateCoinResponseData } = await axios.post(
      `http://localhost:${serverConfig.port}/allocate-coin`
    );

    const { coin, jobId } = AllocateCoinResponseSchema.parse(
      AllocateCoinResponseData
    );

    const gasCoin: Coin = {
      id: coin.id,
      amount: bn(coin.amount),
      assetId: coin.assetId,
      owner: Address.fromAddressOrString(coin.owner),
      blockCreated: bn(coin.blockCreated),
      txCreatedIdx: bn(coin.txCreatedIdx),
    };

    const scriptTransaction = new ScriptTransactionRequest();
    scriptTransaction.addCoinInput(gasCoin);
    scriptTransaction.addCoinOutput(
      Address.fromAddressOrString(gasCoin.owner),
      gasCoin.amount.sub(maxValuePerCoin),
      gasCoin.assetId
    );

    const payload = { request: scriptTransaction.toJSON(), jobId };

    const { status, data } = await axios.post(
      `http://localhost:${serverConfig.port}/sign`,
      payload
    );

    expect(status).toBe(200);
    expect(data).toBeDefined();

    const recievedSignature = data.signature;

    const account = accounts.find((account) => {
      return (
        account.address.toB256().toLowerCase() ===
        gasCoin.owner.toB256().toLowerCase()
      );
    });

    if (!account) {
      throw new Error('Account not found');
    }

    const wallet = Wallet.fromPrivateKey(account.privateKey, fuelProvider);
    const expectedSignature = await wallet.signTransaction(scriptTransaction);

    expect(recievedSignature.toLowerCase()).toEqual(
      expectedSignature.toLowerCase()
    );
  });
});

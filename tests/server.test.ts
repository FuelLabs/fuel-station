import { expect, test, describe, afterAll } from 'bun:test';
import type { GasStationServerConfig } from '../src/lib/server';
import {
  AllocateCoinResponseSchema,
  envSchema,
  FuelClient,
  GasStationServer,
  GetSignatureRequestSchema,
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
import accounts from '../accounts.json';

describe('server', async () => {
  const env = envSchema.parse(process.env);
  const supabaseDB = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const fuelProvider = await Provider.create(env.FUEL_PROVIDER_URL);
  const funderWallet = Wallet.fromPrivateKey(env.FUEL_FUNDER_PRIVATE_KEY);

  const fuelClient = new FuelClient({
    provider: fuelProvider,
    funderWallet: funderWallet,
    minimumCoinValue: env.MINIMUM_COIN_VALUE,
  });

  const serverConfig: GasStationServerConfig = {
    port: 3000,
    supabaseDB: new SupabaseDB(supabaseDB),
    fuelClient: fuelClient,
    funderWallet: funderWallet,
    isHttps: false,
    allowedOrigins: [],
    enableCaptcha: false,
  };

  const server = new GasStationServer(serverConfig);

  await server.start();

  test('should return healthy', async () => {
    const response = await axios.get(
      `http://localhost:${serverConfig.port}/health`
    );

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ status: 'healthy' });
  });

  test('should return an allocated coin', async () => {
    const { status, data } = await axios.post(
      `http://localhost:${serverConfig.port}/allocate-coin`
    );

    expect(status).toBe(200);

    const { success } = AllocateCoinResponseSchema.safeParse(data);
    expect(success).toBe(true);
  });

  afterAll(async () => {
    await server.stop();
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

    console.log('gasCoin', gasCoin);

    const scriptTransaction = new ScriptTransactionRequest();
    scriptTransaction.addCoinInput(gasCoin);

    const payload = { request: scriptTransaction.toJSON(), jobId };

    const { status, data } = await axios.post(
      `http://localhost:${serverConfig.port}/sign`,
      payload
    );

    expect(status).toBe(200);
    expect(data).toBeDefined();

    const recievedSignature = data.signature;

    const account = accounts.find((account) => {
      return account.address === gasCoin.owner.toB256();
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

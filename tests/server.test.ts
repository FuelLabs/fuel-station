import { expect, test, describe, afterAll } from 'bun:test';
import type { GasStationServerConfig } from '../src/lib/server';
import {
  AllocateCoinResponseSchema,
  envSchema,
  FuelClient,
  GasStationServer,
  SupabaseDB,
} from '../src/lib';
import { createClient } from '@supabase/supabase-js';
import { Provider, Wallet } from 'fuels';
import axios from 'axios';

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
    console.log('env.ENV', env.ENV);
    const response = await axios.post(
      `http://localhost:${serverConfig.port}/allocate-coin`
    );

    expect(response.status).toBe(200);

    const { success } = AllocateCoinResponseSchema.safeParse(response.data);
    expect(success).toBe(true);
  });

  afterAll(async () => {
    await server.stop();
  });
});

import express from 'express';
import { config } from 'dotenv';
import { FuelClient, SupabaseDB } from './lib';
import { createClient } from '@supabase/supabase-js';
import { envSchema } from './lib/config';
import { Provider, ScriptTransactionRequest, Wallet, type Coin } from 'fuels';
import accounts from '../accounts.json';
import cors from 'cors';

config();

const main = async () => {
  const env = envSchema.parse(process.env);

  const supabaseDB = new SupabaseDB(
    createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
  );

  const fuelProvider = await Provider.create(env.FUEL_PROVIDER_URL);
  const funderWallet = Wallet.fromPrivateKey(
    env.FUEL_FUNDER_PRIVATE_KEY,
    fuelProvider
  );
  const paymasterWallet = Wallet.fromPrivateKey(
    env.FUEL_PAYMASTER_PRIVATE_KEY,
    fuelProvider
  );

  const fuelClient = new FuelClient({
    provider: fuelProvider,
    paymasterWallet,
    funderWallet,
    minimumCoinAmount: 1,
    minimumCoinValue: 1,
  });

  const app = express();
  const port = process.env.PORT || 3000;

  // Basic CORS setup
  app.use(
    cors({
      origin: 'http://localhost:5173', // React app's URL
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json());

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
  });

  app.get('/getCoin', async (req, res) => {
    // TODO: Implement coin retrieval logic

    let coin: Coin | null = null;
    let address: string | null = null;

    while (!coin) {
      address = await supabaseDB.getNextAccount();
      if (!address) {
        return res.status(404).json({ error: 'No unlocked account found' });
      }

      const result = await fuelClient.getCoin(address, env.MINIMUM_COIN_AMOUNT);
      if (!result) {
        await supabaseDB.setAccountNeedsFunding(address, true);
        continue;
      }

      coin = result;
    }

    if (!address) {
      return res
        .status(404)
        .json({ error: 'No unlocked account found after multiple attempts' });
    }
    if (!coin) {
      return res
        .status(404)
        .json({ error: 'No unlocked coin found after multiple attempts' });
    }

    // Lock the account for 30 seconds
    const lockError = await supabaseDB.lockAccount(
      address,
      new Date(Date.now() + 1000 * 30)
    );

    if (lockError) {
      console.error(lockError);
      return res.status(500).json({ error: 'Failed to lock account' });
    }

    const { error: insertError, jobId } =
      await supabaseDB.insertNewJob(address);
    if (insertError) {
      console.error(insertError);
      return res.status(500).json({ error: 'Failed to insert job' });
    }

    console.log('jobId', jobId);
    console.log('sent coin:', coin);

    res.status(200).send({ coin, jobId });
  });

  app.post('/sign', async (req, res) => {
    // TODO: use zod to validate the body
    if (!req.body) {
      return res.status(400).json({ error: 'No body provided' });
    }

    console.log('req.body', req.body.request);
    const body = req.body.request;

    const request = new ScriptTransactionRequest();

    request.type = body.type;
    request.gasLimit = body.gasLimit;
    request.script = body.script;
    request.scriptData = body.scriptData;
    request.maxFee = body.maxFee;

    request.inputs = body.inputs;
    request.outputs = body.outputs;

    request.witnesses = body.witnesses;

    // TODO: Ideally the paymaster needs to search the witness index for providing its signature
    request.witnesses[1] = await wallet.signTransaction(request);

    res.status(200).json({ signature: await wallet.signTransaction(request) });
  });

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
};

main();

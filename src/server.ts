import express from 'express';
import { config } from 'dotenv';
import { SupabaseDB } from './lib';
import { createClient } from '@supabase/supabase-js';
import { envSchema } from './lib/config';
import { Provider, ScriptTransactionRequest, Wallet } from 'fuels';

config();

const env = envSchema.parse(process.env);

const supabaseDB = new SupabaseDB(
  createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
);

const fuelProvider = await Provider.create(env.FUEL_PROVIDER_URL);
const wallet = Wallet.fromPrivateKey(
  env.FUEL_PAYMASTER_PRIVATE_KEY,
  fuelProvider
);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.get('/getCoin', async (req, res) => {
  // TODO: Implement coin retrieval logic

  const coin = await supabaseDB.getUnlockedCoin();

  if (!coin) {
    return res.status(404).json({ error: 'No unlocked coin found' });
  }

  const lockError = await supabaseDB.lockCoin(
    coin.utxo_id,
    new Date(Date.now() + 1000 * 30)
  );

  if (lockError) {
    console.error(lockError);
    return res.status(500).json({ error: 'Failed to lock coin' });
  }

  console.log(coin);

  res.status(501).json({ error: 'Not implemented' });
});

app.post('/sign', async (req, res) => {
  // TODO: use zod to validate the body
  if (!req.body) {
    return res.status(400).json({ error: 'No body provided' });
  }

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

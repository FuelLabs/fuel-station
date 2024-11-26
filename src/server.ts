import express from 'express';
import { config } from 'dotenv';
import { SupabaseDB } from './lib';
import { createClient } from '@supabase/supabase-js';
import { envSchema } from './lib/config';

config();

const env = envSchema.parse(process.env);

const supabaseDB = new SupabaseDB(
  createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

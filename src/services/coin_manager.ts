import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import type { Database } from '../types/database.types';
import { SupabaseDB } from '../lib';

config();

const main = async () => {
  if (!process.env.SUPABASE_URL) {
    throw new Error('SUPABASE_URL is not set');
  }

  if (!process.env.SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_ANON_KEY is not set');
  }

  const supabaseClient: SupabaseClient<Database> = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  const supabaseDB = new SupabaseDB(supabaseClient);

  const totalCoins = await supabaseDB.getTotalCoinsCount();

  console.log(`Total coins: ${totalCoins}`);
};

main();

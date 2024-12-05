import { createClient } from '@supabase/supabase-js';
import { envSchema } from '../src/lib/schema/config';
import type { Database } from '../src/types/database.types';

const main = async () => {
  const env = envSchema.parse(process.env);

  const supabase = createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY
  );
  // unlock all coins
  const { error } = await supabase
    .from('coins')
    .update({ is_locked: false, expiry: null })
    .eq('is_locked', true);

  if (error) {
    console.error('Error unlocking coins:', error);
    process.exit(1);
  }

  console.log('Coins unlocked successfully');
};

main();

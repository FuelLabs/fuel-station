import { createClient } from '@supabase/supabase-js';
import { envSchema } from '../src/lib';
import accounts from '../accounts.json';
import type { Database } from '../src/types';

const main = async () => {
  const env = envSchema.parse(process.env);

  const supabase = createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY
  );

  for (const account of accounts) {
    const { error } = await supabase.from('accounts').insert({
      address: account.address,
      is_locked: false,
      needs_funding: true,
    });

    if (error) {
      console.error(error);
      process.exit(1);
    }
  }

  console.log(`Uploaded ${accounts.length} accounts to the database`);
};

main();

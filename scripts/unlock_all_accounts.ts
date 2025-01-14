import { createClient } from '@supabase/supabase-js';
import { envSchema } from '../src/lib/schema/config';
import type { Database } from '../src/types/database.types';
import { ACCOUNT_TABLE_NAME } from '../src/constants';

const main = async () => {
  const env = envSchema.parse(process.env);

  const supabase = createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );
  // unlock all accounts
  const { error } = await supabase
    .from(ACCOUNT_TABLE_NAME)
    .update({ is_locked: false, expiry: null })
    .eq('is_locked', true);

  if (error) {
    console.error('Error unlocking accounts:', error);
    process.exit(1);
  }

  console.log('Accounts unlocked successfully');
};

main();

import { createClient } from '@supabase/supabase-js';
import { envSchema } from '../src/lib/schema/config';

const main = async () => {
  const env = envSchema.parse(process.env);

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

  // delete all records from the coins table
  // all ids are positive
  const { error } = await supabase.from('coins').delete().gt('id', -1);

  if (error) {
    console.error('Error deleting coins:', error);
    process.exit(1);
  }

  console.log('Coins deleted successfully');

  const { error: accountsError } = await supabase
    .from('accounts')
    .delete()
    .gt('id', -1);

  if (accountsError) {
    console.error('Error deleting accounts:', accountsError);
    process.exit(1);
  }

  console.log('Accounts deleted successfully');
};

main();

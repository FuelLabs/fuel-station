import { createClient } from '@supabase/supabase-js';
import { envSchema } from '../src/lib/config';

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
};

main();

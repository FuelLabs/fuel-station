import { createClient } from '@supabase/supabase-js';
import { envSchema } from '../src/lib/schema/config';
import { ACCOUNT_TABLE_NAME, JOB_TABLE_NAME } from '../src/constants';

const main = async () => {
  const env = envSchema.parse(process.env);

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

  const { error: accountsError } = await supabase
    .from(ACCOUNT_TABLE_NAME)
    .delete()
    .gt('id', -1);

  if (accountsError) {
    console.error('Error deleting accounts:', accountsError);
    process.exit(1);
  }

  console.log('Accounts deleted successfully');

  const { error: jobsError } = await supabase
    .from(JOB_TABLE_NAME)
    .delete()
    .neq('job_id', ''); // Delete all rows by using a condition that's always true

  if (jobsError) {
    console.error('Error deleting jobs:', jobsError);
    process.exit(1);
  }

  console.log('Jobs deleted successfully');
};

main();

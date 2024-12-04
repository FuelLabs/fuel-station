import { createClient } from '@supabase/supabase-js';
import { envSchema, SupabaseDB } from '../src/lib/index';
import type { Database } from '../src/types/database.types';
import { Wallet } from 'fuels';
import type { FuelAccount } from '../src/types';
import { writeFileSync } from 'node:fs';

const main = async () => {
  const env = envSchema.parse(process.env);

  const supabaseClient = createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY
  );
  const supabase = new SupabaseDB(supabaseClient);

  const totalAccountsCount = await supabase.getTotatAccountsCount();

  if (totalAccountsCount) {
    console.error('Accounts already exist');
    process.exit(1);
  }

  console.log('Creating accounts...');

  const accounts: FuelAccount[] = [];

  for (let i = 0; i < env.NUM_OF_ACCOUNTS; i++) {
    const wallet = Wallet.generate();

    accounts.push({
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey,
    });
  }

  console.log(`Generated ${accounts.length} accounts...`);

  console.log('Inserting accounts into database...');

  await supabase.insertAccounts(accounts.map((account) => account.publicKey));

  console.log('Insert Done!');

  console.log('saving accounts to file...');

  writeFileSync('accounts.json', JSON.stringify(accounts, null, 2));

  console.log('Done!');
};

main();

import { createClient } from '@supabase/supabase-js';
import { envSchema, generateMnemonicWallets } from '../src/lib';
import type { Database } from '../src/types';

const main = async () => {
  const env = envSchema.parse(process.env);

  const supabase = createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  const accounts = generateMnemonicWallets(
    env.FUEL_PAYMASTER_MNEMONIC,
    env.NUM_OF_ACCOUNTS
  );

  for (const account of accounts) {
    const { error } = await supabase.from('accounts').insert({
      address: account.address.toB256(),
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

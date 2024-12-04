import { sleep } from 'bun';
import { envSchema, FuelClient, SupabaseDB } from '../lib';
import type { Database } from '../types';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Provider, Wallet } from 'fuels';

const env = envSchema.parse(process.env);

// We work with the assumption that the account always has a single coin with a great value than the minimum coin value
// Working with a single coin assumption allows us to simplify the logic
const coinManagerProcess = async (
  supabaseDB: SupabaseDB,
  fuelClient: FuelClient
) => {
  const unlockedAccounts = await supabaseDB.getUnlockedAccounts();
  console.log(`Found ${unlockedAccounts.length} unlocked accounts`);

  for (const walletAddress of unlockedAccounts) {
    // TODO: We are assuming that the getResources will return a single coin if a coin with highe or equal value to the minimum coin value exists
    // i.e: If we query for 10 coins, and the accounts has [10, 5, 1, 2, 2]
    // then getResources will return [10] and not [10, 5, 1, 2, 2]
    // if this is not the case, we need to create our own function for this
    const resources = await fuelClient.getResources(
      walletAddress,
      env.MINIMUM_COIN_AMOUNT
    );
    console.log(`Got ${resources} resources for ${walletAddress}`);

    if (resources.length === 0 && resources.length > 1) {
      console.log(
        `${resources.length} resources found for ${walletAddress}, funding ...`
      );

      await fuelClient.fundAccount(walletAddress, env.MINIMUM_COIN_VALUE * 10);
      console.log(
        `Funded ${walletAddress} with ${env.MINIMUM_COIN_VALUE * 10} coins`
      );
    }
  }
};

const main = async () => {
  const supabaseClient: SupabaseClient<Database> = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY
  );

  const supabaseDB = new SupabaseDB(supabaseClient);

  const fuelProvider = await Provider.create(env.FUEL_PROVIDER_URL);

  const fuelClient = new FuelClient({
    provider: fuelProvider,
    paymasterWallet: Wallet.fromPrivateKey(env.FUEL_PAYMASTER_PRIVATE_KEY),
    funderWallet: Wallet.fromPrivateKey(env.FUEL_FUNDER_PRIVATE_KEY),
    minimumCoinAmount: env.MINIMUM_COIN_AMOUNT,
    minimumCoinValue: env.MINIMUM_COIN_VALUE,
  });

  while (true) {
    await coinManagerProcess(supabaseDB, fuelClient);

    // 5 seconds
    await sleep(5000);
  }
};

main();

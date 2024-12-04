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
  // We first fetch all accounts which need funding
  const accountsThatNeedFunding = await supabaseDB.getAccountsThatNeedFunding();
  for (const walletAddress of accountsThatNeedFunding) {
    const coin = await fuelClient.getCoin(
      walletAddress,
      env.MINIMUM_COIN_AMOUNT
    );

    if (!coin) {
      console.log(`coin not found for ${walletAddress}, funding ...`);
      await fuelClient.fundAccount(walletAddress, env.MINIMUM_COIN_VALUE * 10);
      console.log(
        `Funded ${walletAddress} with ${env.MINIMUM_COIN_VALUE * 10} coins`
      );
    }

    await supabaseDB.setAccountNeedsFunding(walletAddress, false);
  }

  const unlockedAccounts = await supabaseDB.getUnlockedAccounts();
  console.log(`Found ${unlockedAccounts.length} unlocked accounts`);

  for (const walletAddress of unlockedAccounts) {
    const coin = await fuelClient.getCoin(
      walletAddress,
      env.MINIMUM_COIN_AMOUNT
    );
    console.log(`Got coin for ${walletAddress}`);

    if (!coin) {
      console.log(`coin not found for ${walletAddress}, funding ...`);

      await fuelClient.fundAccount(walletAddress, env.MINIMUM_COIN_VALUE * 10);
      console.log(
        `Funded ${walletAddress} with ${env.MINIMUM_COIN_VALUE * 10} coins`
      );

      // 1 second
      await sleep(1000);
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
    paymasterWallet: Wallet.fromPrivateKey(
      env.FUEL_PAYMASTER_PRIVATE_KEY,
      fuelProvider
    ),
    funderWallet: Wallet.fromPrivateKey(
      env.FUEL_FUNDER_PRIVATE_KEY,
      fuelProvider
    ),
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

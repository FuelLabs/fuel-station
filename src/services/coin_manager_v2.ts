import {sleep} from "bun"
import { envSchema, FuelClient, SupabaseDB } from "../lib";
import type { Database } from "../types";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Provider, Wallet } from "fuels";

const env = envSchema.parse(process.env);

const coinManagerProcess = async (supabaseDB: SupabaseDB, fuelClient: FuelClient) => {
  const unlockedAccounts = await supabaseDB.getUnlockedAccounts();
  console.log(`Found ${unlockedAccounts.length} unlocked accounts`);

  for (const walletAddress of unlockedAccounts) {
    const resources = await fuelClient.getResources(walletAddress, env.MINIMUM_COIN_AMOUNT);
    console.log(`Got ${resources} resources for ${walletAddress}`);
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


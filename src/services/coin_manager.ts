import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import type { Database } from '../types/database.types';
import { FuelClient, SupabaseDB } from '../lib';
import { Provider, Wallet } from 'fuels';
import { envSchema } from '../lib/config';

config();

const main = async () => {
  const env = envSchema.parse(process.env);

  const supabaseClient: SupabaseClient<Database> = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY
  );

  const supabaseDB = new SupabaseDB(supabaseClient);

  const fuelProvider = await Provider.create(env.FUEL_PROVIDER_URL);

  const paymasterWallet = Wallet.fromPrivateKey(
    env.FUEL_PAYMASTER_PRIVATE_KEY,
    fuelProvider
  );

  const funderWallet = Wallet.fromPrivateKey(
    env.FUEL_FUNDER_PRIVATE_KEY,
    fuelProvider
  );

  const fuelClient = new FuelClient({
    provider: fuelProvider,
    paymasterWallet,
    funderWallet,
    minimumCoinAmount: Number(process.env.MINIMUM_COIN_AMOUNT),
    minimumCoinValue: Number(process.env.MINIMUM_COIN_VALUE),
  });

  if (
    (await fuelClient.getPaymasterCoins()).length <
    fuelClient.getMinimumCoinAmount()
  ) {
    console.log(
      `Funding paymaster with ${fuelClient.getMinimumCoinValue() + 10} coins`
    );

    const newOutputs = await fuelClient.fundPaymasterCoins(
      fuelClient.getMinimumCoinValue() + 10
    );

    const error = await supabaseDB.insertCoins(
      newOutputs.map((output) => ({
        utxo_id: output.utxoId,
        amount: output.amount.toString(),
        is_locked: false,
      }))
    );

    if (error) {
      console.error('Error inserting coins:', error);
      process.exit(1);
    }
  }

  const coins = await fuelClient.getPaymasterCoins();
};

main();

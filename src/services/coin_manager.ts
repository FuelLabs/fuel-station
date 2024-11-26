import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import type { Database } from '../types/database.types';
import { FuelClient, SupabaseDB } from '../lib';
import { Provider, Wallet } from 'fuels';

config();

const main = async () => {
  if (!process.env.SUPABASE_URL) {
    throw new Error('SUPABASE_URL is not set');
  }

  if (!process.env.SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_ANON_KEY is not set');
  }

  if (!process.env.FUEL_PROVIDER_URL) {
    throw new Error('FUEL_PROVIDER_URL is not set');
  }

  if (!process.env.FUEL_PAYMASTER_PRIVATE_KEY) {
    throw new Error('FUEL_PAYMASTER_PRIVATE_KEY is not set');
  }

  if (!process.env.FUEL_FUNDER_PRIVATE_KEY) {
    throw new Error('FUEL_FUNDER_PRIVATE_KEY is not set');
  }

  if (!process.env.MINIMUM_COIN_AMOUNT) {
    throw new Error('MINIMUM_COIN_AMOUNT is not set');
  }

  if (!process.env.MINIMUM_COIN_VALUE) {
    throw new Error('MINIMUM_COIN_VALUE is not set');
  }

  const supabaseClient: SupabaseClient<Database> = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  const supabaseDB = new SupabaseDB(supabaseClient);

  const fuelProvider = await Provider.create(process.env.FUEL_PROVIDER_URL);

  const paymasterWallet = Wallet.fromPrivateKey(
    process.env.FUEL_PAYMASTER_PRIVATE_KEY,
    fuelProvider
  );

  const funderWallet = Wallet.fromPrivateKey(
    process.env.FUEL_FUNDER_PRIVATE_KEY,
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

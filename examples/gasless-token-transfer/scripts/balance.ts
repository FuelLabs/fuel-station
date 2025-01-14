import { Provider, Wallet } from 'fuels';
import { config } from 'dotenv';
import { envSchema } from '../../../src/lib/schema/config';
import { fuelAccount } from '../depolyments.json';

config();

const main = async () => {
  const env = envSchema.parse(process.env);

  // Create a provider.
  const FUEL_PROVIDER_URL = env.FUEL_PROVIDER_URL;
  if (!FUEL_PROVIDER_URL) {
    console.error(
      'FUEL_PROVIDER_URL is not defined in the environment variables.'
    );
    process.exit(1);
  }

  const provider = await Provider.create(FUEL_PROVIDER_URL);

  const wallet = Wallet.fromPrivateKey(fuelAccount.privateKey, provider);

  const coins = await wallet.getCoins();
  console.log('coins:', coins.coins.length);

  const balances = await wallet.getBalances();
  console.log('balances:', balances);
};

main();

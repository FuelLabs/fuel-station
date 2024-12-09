import { Provider } from 'fuels';
import { envSchema } from '../src/lib';
import accounts from '../accounts.json';

const main = async () => {
  const env = envSchema.parse(process.env);
  const provider = await Provider.create(env.FUEL_PROVIDER_URL);

  for (const account of accounts) {
    const balance = await provider.getBalance(account.address, provider.getBaseAssetId());
    console.log(`${account.address}: ${balance}`);
  }
};

main()
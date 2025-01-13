import { Provider } from 'fuels';
import { envSchema, generateMnemonicWallets } from '../src/lib';

const main = async () => {
  const env = envSchema.parse(process.env);
  const provider = await Provider.create(env.FUEL_PROVIDER_URL);

  const accounts = generateMnemonicWallets(
    env.FUEL_PAYMASTER_MNEMONIC,
    env.NUM_OF_ACCOUNTS
  );

  for (const account of accounts) {
    const balance = await provider.getBalance(
      account.address,
      provider.getBaseAssetId()
    );
    console.log(`${account.address}: ${balance}`);
  }
};

main();

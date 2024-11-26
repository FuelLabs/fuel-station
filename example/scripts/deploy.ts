import { Provider, Wallet } from 'fuels';
import { config } from 'dotenv';
import { DummyStablecoinFactory } from '../src/dummy_stablecoin_artifact';
import { envSchema } from '../../src/lib/config';
import { writeFileSync } from 'node:fs';

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

  // Create our wallet (with a private key).
  const PRIVATE_KEY = env.FUEL_FUNDER_PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    console.error('PRIVATE_KEY is not defined in the environment variables.');
    process.exit(1);
  }

  const wallet = Wallet.fromPrivateKey(PRIVATE_KEY, provider);

  const stableCoinFactor = new DummyStablecoinFactory(wallet);
  const { contractId, waitForTransactionId } = await stableCoinFactor.deploy();

  await waitForTransactionId();
  console.log('deployed to contractId: ', contractId);

  const fuelAccount = Wallet.generate();

  writeFileSync(
    './example/depolyments.json',
    JSON.stringify(
      {
        contractId,
        fuelAccount: {
          privateKey: fuelAccount.privateKey,
          publicKey: fuelAccount.publicKey,
        },
      },
      null,
      2
    )
  );
};

main();

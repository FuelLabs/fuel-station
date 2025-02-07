import { createAssetId, Provider, Wallet, ZeroBytes32 } from 'fuels';
import { config } from 'dotenv';
import { DummyStablecoinFactory, gaslessTransferEnvScheme } from '../src';
import { writeFileSync } from 'node:fs';

config();

const main = async () => {
  const env = gaslessTransferEnvScheme.parse(process.env);

  // Create a provider.
  const FUEL_PROVIDER_URL = env.PROVIDER_URL;
  if (!FUEL_PROVIDER_URL) {
    console.error(
      'FUEL_PROVIDER_URL is not defined in the environment variables.'
    );
    process.exit(1);
  }

  const provider = await Provider.create(FUEL_PROVIDER_URL);

  // Create our wallet (with a private key).
  const PRIVATE_KEY = env.PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    console.error('PRIVATE_KEY is not defined in the environment variables.');
    process.exit(1);
  }

  const wallet = Wallet.fromPrivateKey(PRIVATE_KEY, provider);

  const stableCoinFactor = new DummyStablecoinFactory(wallet);
  const { contractId, waitForTransactionId } = await stableCoinFactor.deploy();

  const assetId = createAssetId(contractId, ZeroBytes32);

  await waitForTransactionId();
  console.log('deployed to contractId: ', contractId);
  console.log('assetId: ', assetId);

  const fuelAccount = Wallet.generate();

  writeFileSync(
    './depolyments.json',
    JSON.stringify(
      {
        contractId,
        assetId,
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

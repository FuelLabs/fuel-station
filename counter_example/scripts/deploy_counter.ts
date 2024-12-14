import { Wallet, Provider } from 'fuels';
import { envSchema } from '../../src/lib';
import { ContractsFactory } from '../out/index';
import { writeFileSync } from 'node:fs';

const main = async () => {
  const env = envSchema.parse(process.env);

  const provider = await Provider.create(env.FUEL_PROVIDER_URL);

  const wallet = Wallet.fromPrivateKey(env.FUEL_FUNDER_PRIVATE_KEY, provider);

  const { contractId } = await ContractsFactory.deploy(wallet);

  console.log(`Counter contract deployed at ${contractId}`);

  console.log('Writing to deployments.json');

  writeFileSync(
    './counter_example/deployments.json',
    JSON.stringify({ contractId }, null, 2)
  );

  console.log('Done');
};

main();

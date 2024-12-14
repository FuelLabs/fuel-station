import { Contract, Provider } from 'fuels';
import { envSchema } from '../../src/lib';
import { Contracts } from '../out/index';
import { contractId } from '../deployments.json';

const main = async () => {
  const env = envSchema.parse(process.env);

  const provider = await Provider.create(env.FUEL_PROVIDER_URL);

  const contract = new Contract(contractId, Contracts.abi, provider);

  const { value } = await contract.functions.count().get();
  console.log('count:', value);
};

main();

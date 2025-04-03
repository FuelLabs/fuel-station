import { Provider } from 'fuels';
import { envSchema } from '../src/lib';

const main = async () => {
  const ENV = envSchema.parse(process.env);
  const provider = new Provider(ENV.FUEL_PROVIDER_URL);

  const gasPrice = await provider.getLatestGasPrice();
  console.log('gasPrice', gasPrice);

  const gasConfig = provider.getGasConfig();
  console.log('gasConfig', gasConfig);
};

main();

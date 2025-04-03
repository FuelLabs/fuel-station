import { Provider } from 'fuels';
import { envSchema } from '../src/lib';

const ADDRESS =
  '0x6fb16036d85a36ed88e3f6d8ce2cb302c4f6f6a60b67346dd5c97bd58516fa91';

const main = async () => {
  const env = envSchema.parse(process.env);

  const provider = new Provider(env.FUEL_PROVIDER_URL);

  const coins = await provider.getCoins(ADDRESS, await provider.getBaseAssetId());

  console.log(coins);
};

main();

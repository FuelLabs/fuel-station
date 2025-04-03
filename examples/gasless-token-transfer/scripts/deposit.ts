import { Provider } from 'fuels';
import { GasStationClient } from '../../../src/lib/client';
import { gaslessTransferEnvScheme } from '../src';

// NOTE: this script can only work on local instances, otherwise the deposit endpoint is protected
const main = async () => {
  const env = gaslessTransferEnvScheme.parse(process.env);

  const provider = new Provider(env.PROVIDER_URL);
  const gaslessToken = env.AUTH_TOKEN;

  console.log('gaslessToken', gaslessToken);

  const gasStationClient = new GasStationClient(
    env.STATION_SERVER_URL,
    provider,
    gaslessToken
  );

  console.log('funding auth token');

  // 0.01 ETH
  const depositStatus = await gasStationClient.deposit(10000000);
  if (!depositStatus) {
    console.error('failed to process deposit');
    process.exit(1);
  }

  console.log('deposit status', depositStatus);
};

main();

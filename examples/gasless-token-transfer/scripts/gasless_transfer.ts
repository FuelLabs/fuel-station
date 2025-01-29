import { Provider, ScriptTransactionRequest, Wallet } from 'fuels';
import { envSchema } from '../../../src/lib/schema/config';
import { fuelAccount, assetId } from '../depolyments.json';
import { GasStationClient } from '../../../src/lib/client';

const main = async () => {
  const env = envSchema.parse(process.env);

  const provider = await Provider.create(env.FUEL_PROVIDER_URL);
  const wallet = Wallet.fromPrivateKey(fuelAccount.privateKey, provider);

  const gaslessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbiI6IjNhN2YxMzVkLTFlOWEtNDUxMi04MWNmLTMyNTNjOGY3ODVkNSIsImlhdCI6MTczODE0NzM3MH0.BoLYGpKgQQix7BB3a5dru8jKeG9OFrgQoiTLRhTTIlk';

  console.log('gaslessToken', gaslessToken);

  const gasStationClient = new GasStationClient(
    env.FUEL_STATION_SERVER_URL,
    provider,
    gaslessToken
  );

  const balance = await gasStationClient.balance(gaslessToken);
  console.log('balance', balance);

  if (balance < env.FUNDING_AMOUNT) {
    console.log('funding token');
    const depositStatus = await gasStationClient.deposit(env.FUNDING_AMOUNT);
    if (!depositStatus) {
      console.error('failed to process deposit');
      process.exit(1);
    }
  }

  const randomReciever = Wallet.generate();

  let request = new ScriptTransactionRequest();

  const { coins } = await wallet.getCoins(assetId.bits);
  if (!coins.length) {
    throw new Error('No coins found');
  }

  request.addCoinInput(coins[0]);

  // NOTE: addCoinInput automatically adds a change output for that particular asset's coin to the same address
  request.outputs = [];

  request.addCoinOutput(randomReciever.address, 100, assetId.bits);

  const { transaction, gasCoin, jobId } =
    await gasStationClient.prepareGaslessTransaction(request);
  request = transaction;

  console.log(
    'reciever balance before:',
    await provider.getBalance(randomReciever.address, assetId.bits)
  );

  // const txResult = await (
  await gasStationClient.sendTransaction({
    transaction: request,
    wallet,
    gasCoin,
    jobId,
  });
  // ).waitForResult();

  // console.log('tx status:', txResult.status);

  // console.log(
  //   'balance of reciever after:',
  //   await provider.getBalance(randomReciever.address, assetId.bits)
  // );
};

main();

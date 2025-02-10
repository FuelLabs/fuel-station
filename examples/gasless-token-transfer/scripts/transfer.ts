import { Provider, ScriptTransactionRequest, Wallet } from 'fuels';
import { fuelAccount, assetId } from '../depolyments.json';
import { GasStationClient } from '../../../src/lib/client';
import { gaslessTransferEnvScheme } from '../src';

const main = async () => {
  const env = gaslessTransferEnvScheme.parse(process.env);

  const provider = await Provider.create(env.PROVIDER_URL);
  const wallet = Wallet.fromPrivateKey(fuelAccount.privateKey, provider);

  const gaslessToken = env.AUTH_TOKEN;

  console.log('gaslessToken', gaslessToken);

  const gasStationClient = new GasStationClient(
    env.STATION_SERVER_URL,
    provider,
    gaslessToken
  );

  // this is the balance for the particular auth token in the gas station
  // this needs to be above a certain amount to be able to send a transaction
  const gasStationBalance = await gasStationClient.balance();
  console.log(
    `gasStationBalance for the token ${gaslessToken} is ${gasStationBalance}`
  );

  if (gasStationBalance <= 0) {
    console.error('gasStationBalance is 0 or less, please fund the token');
    process.exit(1);
  }

  const randomReciever = Wallet.generate();

  const request = new ScriptTransactionRequest();

  const { coins } = await wallet.getCoins(assetId.bits);
  if (!coins.length) {
    throw new Error('No coins found');
  }

  request.addCoinInput(coins[0]);

  // NOTE: addCoinInput automatically adds a change output for that particular asset's coin to the same address
  request.outputs = [];

  request.addCoinOutput(randomReciever.address, coins[0].amount, assetId.bits);

  console.log(
    'reciever balance before:',
    await provider.getBalance(randomReciever.address, assetId.bits)
  );

  const txResult = await (
    await gasStationClient.sendTransaction(request, wallet)
  ).waitForResult();

  console.log('tx status:', txResult.status);

  console.log(
    'balance of reciever after:',
    await provider.getBalance(randomReciever.address, assetId.bits)
  );
};

main();

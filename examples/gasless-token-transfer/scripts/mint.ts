import { bn, Provider, Wallet } from 'fuels';
import { config } from 'dotenv';
import { DummyStablecoin } from '../src';
import { gaslessTransferEnvScheme } from '../src';
import { contractId, fuelAccount } from '../depolyments.json';

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
  const reciever = Wallet.fromPrivateKey(fuelAccount.privateKey, provider);

  const stableCoin = new DummyStablecoin(contractId, wallet);

  const balanceBeforeMinting = await reciever.getBalances();
  console.log('balance before minting is,', balanceBeforeMinting);

  const call = stableCoin.functions.mint(
    {
      Address: {
        bits: reciever.address.toB256(),
      },
    },
    undefined,
    bn(100)
  );

  call.callParams({ gasLimit: 100000 });

  const callResult = await (await call.call()).waitForResult();
  console.log(
    'mint status:',
    (await callResult.transactionResponse.waitForResult()).status
  );

  const balanceAfterMinting = await reciever.getBalances();
  console.log('balance after minting is,', balanceAfterMinting);

  console.log('reciever address:', reciever.address.toB256());
};

main();

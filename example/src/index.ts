import {
  createAssetId,
  Provider,
  ScriptTransactionRequest,
  Wallet,
  ZeroBytes32,
} from 'fuels';
import { envSchema } from '../../src/lib/config';
import { contractId, fuelAccount } from '../depolyments.json';
import axios from 'axios';

const main = async () => {
  const env = envSchema.parse(process.env);

  const provider = await Provider.create(env.FUEL_PROVIDER_URL);
  const wallet = Wallet.fromPrivateKey(fuelAccount.privateKey, provider);
  const paymasterWallet = Wallet.fromPrivateKey(
    env.FUEL_PAYMASTER_PRIVATE_KEY,
    provider
  );

  const assetId = createAssetId(contractId, ZeroBytes32);

  const randomReciever = Wallet.generate();

  const request = new ScriptTransactionRequest();

  const { coins } = await wallet.getCoins(assetId.bits);
  if (!coins.length) {
    throw new Error('No coins found');
  }

  request.addCoinInput(coins[0]);

  // NOTE: addCoinInput automatically adds a change output for that particular asset's coin to the same address
  request.outputs = [];

  request.addCoinOutput(randomReciever.address, 10, assetId.bits);
  request.addChangeOutput(Wallet.generate().address, assetId.bits);

  console.log('address of sender wallet:', wallet.address.toB256());
  console.log('request outputs:', request.outputs);

  const gasCoin = (await paymasterWallet.getCoins()).coins[0];

  request.addCoinInput(gasCoin);
  request.addChangeOutput(paymasterWallet.address, provider.getBaseAssetId());

  const result = await provider.estimateTxGasAndFee({
    transactionRequest: request,
  });

  request.maxFee = result.maxFee;
  request.gasLimit = result.maxGas;

  request.witnesses[0] = await wallet.signTransaction(request);

  const response = await axios.post('http://localhost:3000/sign', {
    request: request.toJSON(),
  });

  if (response.status !== 200) {
    throw new Error('Failed to sign transaction');
  }

  if (!response.data.signature) {
    throw new Error('No signature found');
  }

  request.witnesses[1] = response.data.signature;

  const txResult = await (
    await provider.sendTransaction(request)
  ).waitForResult();

  console.log('tx status:', txResult.status);

  //   const tx = await wallet.sendTransaction(request);

  //   console.log('tx:', tx);

  console.log(
    'balance of reciever:',
    await provider.getBalance(randomReciever.address, assetId.bits)
  );
};

main();

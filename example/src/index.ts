import {
  createAssetId,
  getMintedAssetId,
  InputCoinCoder,
  Provider,
  ScriptTransactionRequest,
  Wallet,
  ZeroBytes32,
  type Coin,
  type InputCoin,
} from 'fuels';
import { envSchema } from '../../src/lib/config';
import { contractId, fuelAccount } from '../depolyments.json';

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

  console.log('wallet coins:', await wallet.getBalance(assetId.bits));

  console.log('asset id:', assetId);

  const request = new ScriptTransactionRequest();

  const { coins } = await wallet.getCoins(assetId.bits);
  if (!coins.length) {
    throw new Error('No coins found');
  }

  request.addCoinInput(coins[0]);
  request.addCoinOutput(randomReciever.address, 10, assetId.bits);

  const gasCoin = (await paymasterWallet.getCoins()).coins[0];

  request.addCoinInput(gasCoin);
  request.addVariableOutputs(1);

  const result = await provider.estimateTxGasAndFee({
    transactionRequest: request,
  });

  request.maxFee = result.maxFee;
  request.gasLimit = result.maxGas;

  console.log('result:', result);

  //   const tx = await wallet.sendTransaction(request);

  //   console.log('tx:', tx);
};

main();

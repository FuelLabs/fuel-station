import { Provider, Contract, Wallet } from 'fuels';
import { envSchema } from '../../src/lib';
import { contractId } from '../deployments.json';
import { Contracts } from '../out/index';

const main = async () => {
  const env = envSchema.parse(process.env);

  const provider = await Provider.create(env.FUEL_PROVIDER_URL);
  const wallet = Wallet.fromPrivateKey(env.FUEL_FUNDER_PRIVATE_KEY, provider);

  const contract = new Contract(contractId, Contracts.abi, provider);

  const request = await contract.functions.increase().getTransactionRequest();

  console.log(request.inputs);
  console.log(request.outputs);

  const { gasLimit, gasPrice, maxGas, maxFee } =
    await provider.estimateTxGasAndFee({ transactionRequest: request });

  request.gasLimit = gasLimit;
  request.maxFee = maxFee;

  console.log(request.gasLimit);
  console.log(request.maxFee);

  const { coins } = await wallet.getCoins();
  if (coins.length === 0) {
    throw new Error('No coins found in wallet');
  }

  const gasCoin = coins[0];

  request.addCoinInput(gasCoin);

  const gasInput = request.inputs.find((coin) => {
    return coin.type === 0;
  });

  if (!gasInput) {
    throw new Error('Gas coin not found');
  }

  const signature = await wallet.signTransaction(request);
  request.witnesses[gasInput.witnessIndex] = signature;

  console.log(request.witnesses);

  await provider.sendTransaction(request);

  console.log('count increased');
};

main();

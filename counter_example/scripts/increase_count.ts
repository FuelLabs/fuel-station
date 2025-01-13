import { Provider, Contract, Wallet, Address, bn } from 'fuels';
import { envSchema } from '../../src/lib';
import { contractId } from '../deployments.json';
import { Contracts } from '../out/index';
import axios from 'axios';

const main = async () => {
  const env = envSchema.parse(process.env);

  const provider = await Provider.create(env.FUEL_PROVIDER_URL);

  const contract = new Contract(contractId, Contracts.abi, provider);

  const request = await contract.functions.increase().getTransactionRequest();

  console.log(request.inputs);
  console.log(request.outputs);

  // TODO: use zod type for the response
  const { data: MetaDataResponse } = await axios.get<{
    maxValuePerCoin: string;
  }>(`${env.FUEL_STATION_SERVER_URL}/metadata`);

  const { maxValuePerCoin } = MetaDataResponse;

  if (!maxValuePerCoin) {
    throw new Error('No maxValuePerCoin found');
  }

  // TODO: use zod to validate the response
  const { data } = await axios.post<{ utxoId: string }>(
    `${env.FUEL_STATION_SERVER_URL}/allocate-coin`
  );

  if (!data.coin) {
    throw new Error('No coin found');
  }

  if (!data.jobId) {
    throw new Error('No jobId found');
  }

  const gasCoin: Coin = {
    id: data.coin.id,
    amount: bn(data.coin.amount),
    assetId: data.coin.assetId,
    owner: Address.fromAddressOrString(data.coin.owner),
    blockCreated: bn(data.coin.blockCreated),
    txCreatedIdx: bn(data.coin.txCreatedIdx),
  };

  console.log(gasCoin);

  const account = accounts.find(
    (account) => account.address === data.coin.owner
  );
  if (!account) {
    throw new Error('Account not found');
  }

  const paymasterWallet = Wallet.fromPrivateKey(account.privateKey, provider);

  request.addCoinInput(gasCoin);

  request.addCoinOutput(
    paymasterWallet.address,
    gasCoin.amount.sub(maxValuePerCoin),
    provider.getBaseAssetId()
  );

  // if this gas is sponsored, then should go back to the sponsor
  // if not, then should go to the user
  request.addChangeOutput(paymasterWallet.address, provider.getBaseAssetId());

  const { gasLimit, maxFee } = await provider.estimateTxGasAndFee({
    transactionRequest: request,
  });

  request.gasLimit = gasLimit;
  request.maxFee = maxFee;

  const response = await axios.post(`${env.FUEL_STATION_SERVER_URL}/sign`, {
    request: request.toJSON(),
    jobId: data.jobId,
  });

  if (response.status !== 200) {
    throw new Error('Failed to sign transaction');
  }

  if (!response.data.signature) {
    throw new Error('No signature found');
  }

  // we find the gas input by type 0
  // we find it to get the witness index where to inject the signature
  const gasInput = request.inputs.find((coin) => {
    return coin.type === 0;
  });

  if (!gasInput) {
    throw new Error('Gas coin not found');
  }

  request.witnesses[gasInput.witnessIndex] = response.data.signature;

  await provider.sendTransaction(request);

  console.log('count increased');
};

main();

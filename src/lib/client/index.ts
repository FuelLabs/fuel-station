import axios from 'axios';
import {
  Address,
  bn,
  InputType,
  type Provider,
  type Coin,
  type InputCoin,
  type ScriptTransactionRequest,
  WalletLocked,
  WalletUnlocked,
} from 'fuels';

export class GasStationClient {
  endpoint: string;
  fuelProvider: Provider;

  constructor(endpoint: string, fuelProvider: Provider) {
    this.endpoint = endpoint;
    this.fuelProvider = fuelProvider;
  }

  async prepareGaslessTransaction(transaction: ScriptTransactionRequest) {
    const { data: allocateCoinResponseData } = await axios.post(
      `${this.endpoint}/allocate-coin`
    );

    if (!allocateCoinResponseData.coin) {
      throw new Error('No coin found');
    }

    if (!allocateCoinResponseData.jobId) {
      throw new Error('No jobId found');
    }

    const { coin, jobId } = allocateCoinResponseData;

    const gasCoin: Coin = {
      id: coin.id,
      amount: bn(coin.amount),
      assetId: coin.assetId,
      owner: Address.fromAddressOrString(coin.owner),
      blockCreated: bn(coin.blockCreated),
      txCreatedIdx: bn(coin.txCreatedIdx),
    };

    transaction.addCoinInput(gasCoin);

    const { data: maxValuePerCoinResponseData } = await axios.get(
      `${this.endpoint}/metadata`
    );

    const maxValuePerCoin = bn(maxValuePerCoinResponseData.maxValuePerCoin);

    transaction.addCoinOutput(
      gasCoin.owner,
      gasCoin.amount.sub(maxValuePerCoin),
      gasCoin.assetId
    );

    return { transaction, gasCoin, jobId };
  }

  async sendTransaction({
    transaction,
    gasCoin,
    wallet,
    jobId,
    skipEstimate,
  }: {
    transaction: ScriptTransactionRequest;
    wallet: WalletUnlocked;
    gasCoin: Coin;
    jobId: string;
    skipEstimate?: boolean;
  }) {
    if (!skipEstimate) {
      const result = await this.fuelProvider.estimateTxGasAndFee({
        transactionRequest: transaction,
      });

      transaction.maxFee = result.maxFee;
      transaction.gasLimit = result.maxGas;
    }

    const { data: signatureResponseData } = await axios.post(
      `${this.endpoint}/sign`,
      {
        request: transaction.toJSON(),
        jobId,
      }
    );

    if (!signatureResponseData.signature) {
      throw new Error('No signature found');
    }

    const signature = signatureResponseData.signature;

    const gasCoinInput = transaction.inputs.find((input) => {
      if (input.type === InputType.Coin) {
        return (
          input.owner === gasCoin.owner.toB256() &&
          input.assetId === gasCoin.assetId
        );
      }

      return false;
    }) as InputCoin | undefined;

    // we should never reach this branch of code
    if (!gasCoinInput) {
      throw new Error('Gas coin input not found');
    }

    const witnessIndex = gasCoinInput.witnessIndex;
    transaction.witnesses[witnessIndex] = signature;

    const request =
      await wallet.populateTransactionWitnessesSignature(transaction);

    return this.fuelProvider.sendTransaction(request);

    // return this.fuelProvider.sendTransaction(transaction);
  }
}

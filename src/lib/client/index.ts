import axios from 'axios';
import { Address, bn, type Coin, type ScriptTransactionRequest } from 'fuels';
import { findInputCoinTypeCoin } from '../utils';

export class gasStationClient {
  endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
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

    const { data: signature } = await axios.post(`${this.endpoint}/sign`, {
      request: transaction.toJSON(),
      jobId,
    });

    const gasCoinInput = findInputCoinTypeCoin(
      // @ts-ignore: This should work, although we need to change this util's interface
      transaction,
      gasCoin.owner,
      gasCoin.assetId
    );

    // we should never reach this branch of code
    if (!gasCoinInput) {
      throw new Error('Gas coin input not found');
    }

    const witnessIndex = gasCoinInput.witnessIndex;
    transaction.witnesses[witnessIndex] = signature;

    return transaction;
  }
}

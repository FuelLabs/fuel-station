import axios from 'axios';
import { Address, bn, type Coin, type ScriptTransactionRequest } from 'fuels';

export class gasStationClient {
  endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async prepareGasLessTransaction(transaction: ScriptTransactionRequest) {
    const { data } = await axios.post(`${this.endpoint}/allocate-coin`);

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

    transaction.addCoinInput(gasCoin);
  }
}

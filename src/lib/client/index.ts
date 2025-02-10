import axios from 'axios';
import {
  Address,
  bn,
  InputType,
  OutputType,
  type Provider,
  type Coin,
  type InputCoin,
  type OutputCoin,
  type ScriptTransactionRequest,
  type WalletUnlocked,
} from 'fuels';

export class GasStationClient {
  endpoint: string;
  fuelProvider: Provider;
  token: string | null;

  constructor(endpoint: string, fuelProvider: Provider, token: string | null) {
    this.endpoint = endpoint;
    this.fuelProvider = fuelProvider;
    this.token = token;
  }

  static async generateToken(endpoint: string) {
    const { data: tokenResponseData } = await axios.get(`${endpoint}/token`);

    return tokenResponseData.token;
  }

  async deposit(balance: number): Promise<boolean> {
    const { data } = await axios.post(`${this.endpoint}/deposit`, {
      token: this.token,
      balance,
    });

    return data.status;
  }

  async balance(): Promise<number> {
    const { data } = await axios.get(`${this.endpoint}/balance/${this.token}`);

    return data.balance;
  }

  async sendTransaction(
    transaction: ScriptTransactionRequest,
    wallet: WalletUnlocked
  ) {
    const { data: allocateCoinResponseData } = await axios.post(
      `${this.endpoint}/allocate-coin`,
      {
        token: this.token,
      }
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

    transaction.addCoinOutput(gasCoin.owner, 0, gasCoin.assetId);

    const result = await this.fuelProvider.estimateTxGasAndFee({
      transactionRequest: transaction,
    });

    transaction.maxFee = result.maxFee;
    transaction.gasLimit = result.maxGas;

    const gasCoinOutput = transaction.outputs.find((output) => {
      if (output.type === OutputType.Coin) {
        if (
          output.to === gasCoin.owner.toB256() &&
          output.assetId === gasCoin.assetId
        ) {
          return true;
        }
      }
    }) as OutputCoin | undefined;

    // we should never reach this branch of code
    if (!gasCoinOutput) {
      throw new Error('Gas coin output not found');
    }

    gasCoinOutput.amount = gasCoin.amount.sub(transaction.maxFee);

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
  }
}

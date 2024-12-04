import {
  hexlify,
  OutputType,
  sleep,
  UtxoIdCoder,
  type BN,
  type Coin,
  type Provider,
  type Resource,
  type WalletUnlocked,
} from 'fuels';

export class FuelClient {
  private provider: Provider;

  private paymasterWallet: WalletUnlocked;
  private funderWallet: WalletUnlocked;

  private minimumCoinAmount: number;
  private minimumCoinValue: number;

  private baseAssetId: string;

  constructor(param: {
    provider: Provider;
    paymasterWallet: WalletUnlocked;
    funderWallet: WalletUnlocked;
    minimumCoinAmount: number;
    minimumCoinValue: number;
  }) {
    this.provider = param.provider;
    this.paymasterWallet = param.paymasterWallet;
    this.funderWallet = param.funderWallet;
    this.minimumCoinAmount = param.minimumCoinAmount;
    this.minimumCoinValue = param.minimumCoinValue;

    this.baseAssetId = this.provider.getBaseAssetId();
  }

  
  async getResources(walletAddress: string, amount: number, assetId: string = this.baseAssetId): Promise<Resource[]> 
  {
    return await this.provider.getResourcesToSpend(walletAddress, [
     {
      amount,
      assetId
     } 
    ]);
  }

  // TODO: We need to remove this
  private async getCoins(wallet: WalletUnlocked): Promise<Coin[]> {
    const coins: Coin[] = [];

    let nextCursor: string | undefined = undefined;

    while (true) {
      const result = await this.provider.getCoins(
        wallet.address,
        this.provider.getBaseAssetId(),
        {
          after: nextCursor,
        }
      );

      coins.push(...result.coins);

      if (!result.pageInfo.endCursor) {
        break;
      }
      nextCursor = result.pageInfo.endCursor;
    }

    return coins;
  }

  async getPaymasterCoins(): Promise<Coin[]> {
    return await this.getCoins(this.paymasterWallet);
  }

  async getFunderCoins(): Promise<Coin[]> {
    return await this.getCoins(this.funderWallet);
  }

  async getPaymasterBalance(): Promise<BN> {
    return await this.provider.getBalance(
      this.paymasterWallet.address,
      this.provider.getBaseAssetId()
    );
  }

  async getFunderBalance(): Promise<BN> {
    return await this.provider.getBalance(
      this.funderWallet.address,
      this.provider.getBaseAssetId()
    );
  }

  // Fund the paymaster wallet with the minimum coin value until the minimum coin amount is reached
  async fundPaymasterCoins(
    amount: number
  ): Promise<{ utxoId: string; amount: BN }[]> {
    const coins = await this.getPaymasterCoins();

    const utxoCoder = new UtxoIdCoder();
    const newOutputs: { utxoId: string; amount: BN }[] = [];

    if (coins.length >= this.minimumCoinAmount) {
      return [];
    }

    for (let i = 0; i < this.minimumCoinAmount - coins.length; i++) {
      const { transaction, id: transactionId } = await (
        await this.funderWallet.transfer(this.paymasterWallet.address, amount)
      ).waitForResult();

      if (transaction.outputs) {
        if (transaction.outputs.length !== 2) {
          throw new Error(
            `Expected 2 outputs for transaction ${transactionId}, got ${transaction.outputs.length}`
          );
        }

        for (
          let outputIndex = 0;
          outputIndex < transaction.outputs.length;
          outputIndex++
        ) {
          const output = transaction.outputs[outputIndex];

          if (output.type === OutputType.Coin) {
            if (!output.amount.eq(amount)) {
              throw new Error(
                `Coin ${output} has value ${output.amount} which is less than the minimum coin value ${this.minimumCoinValue}`
              );
            }

            if (
              output.to.toLowerCase() !==
              this.paymasterWallet.address.toString().toLowerCase()
            ) {
              throw new Error(
                `Coin ${output} is not sent to the paymaster wallet`
              );
            }

            const utxoID = hexlify(
              utxoCoder.encode({ transactionId, outputIndex })
            );

            newOutputs.push({ utxoId: utxoID, amount: output.amount });
          }
        }
      } else {
        throw new Error(`No outputs found for transaction ${transactionId}`);
      }
    }

    return newOutputs;
  }

  getMinimumCoinAmount(): number {
    return this.minimumCoinAmount;
  }

  getMinimumCoinValue(): number {
    return this.minimumCoinValue;
  }
}

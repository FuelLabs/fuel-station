import { Provider, type BN, type Coin, type WalletUnlocked } from 'fuels';

export class FuelClient {
  private provider: Provider;

  private funderWallet: WalletUnlocked;

  private minimumCoinValue: number;

  private baseAssetId: string;

  constructor(param: {
    provider: Provider;
    funderWallet: WalletUnlocked;
    minimumCoinValue: number;
  }) {
    this.provider = param.provider;
    this.funderWallet = param.funderWallet;
    this.minimumCoinValue = param.minimumCoinValue;

    this.baseAssetId = this.provider.getBaseAssetId();
  }

  async getProvider(): Promise<Provider> {
    return Provider.create(this.provider.url);
  }

  getBaseAssetId(): string {
    return this.baseAssetId;
  }

  // This function will always return a single coin if a coin with a value greater than or equal to the value provided in argument is found
  async getCoin(
    walletAddress: string,
    amount: number,
    assetId: string = this.baseAssetId
  ): Promise<Coin | null> {
    let nextCursor: string | undefined = undefined;

    while (true) {
      const result = await this.provider.getCoins(walletAddress, assetId, {
        after: nextCursor,
      });

      const coin = result.coins.find((coin) => {
        return coin.amount.gte(amount);
      });

      if (coin) {
        return coin;
      }

      if (!result.pageInfo.endCursor) {
        break;
      }

      nextCursor = result.pageInfo.endCursor;
    }

    return null;
  }

  async getSmallCoins(
    walletAddress: string,
    coinSmallerThan: number
  ): Promise<Coin[]> {
    const { coins } = await this.provider.getCoins(
      walletAddress,
      this.baseAssetId
    );

    return coins.filter((coin) => coin.amount.lt(coinSmallerThan));
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

  async getFunderCoins(): Promise<Coin[]> {
    return await this.getCoins(this.funderWallet);
  }

  async getFunderBalance(): Promise<BN> {
    return await this.provider.getBalance(
      this.funderWallet.address,
      this.provider.getBaseAssetId()
    );
  }

  async fundAccount(walletAddress: string, amount: number): Promise<void> {
    await this.funderWallet.transfer(walletAddress, amount);
  }

  getMinimumCoinValue(): number {
    return this.minimumCoinValue;
  }
}

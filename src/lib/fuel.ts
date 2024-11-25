import type { BN, Coin, Provider, WalletUnlocked } from 'fuels';

export class FuelClient {
  private provider: Provider;
  private paymasterWallet: WalletUnlocked;
  private funderWallet: WalletUnlocked;

  constructor(param: {
    provider: Provider;
    paymasterWallet: WalletUnlocked;
    funderWallet: WalletUnlocked;
    minimumCoinAmount: number;
  }) {
    this.provider = param.provider;
    this.paymasterWallet = param.paymasterWallet;
    this.funderWallet = param.funderWallet;
  }

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
}

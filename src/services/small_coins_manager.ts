import { sleep } from 'bun';
import type { FuelClient, SupabaseDB, EnvConfig } from '../lib';
import { RoutineJob } from '../lib/index';
import accounts from '../../accounts.json';
import { Address, bn, ScriptTransactionRequest, Wallet } from 'fuels';

/// This routine looks for small coins in all accounts and if they exist, it sends them to a collector address
export class SmallCoinsManager extends RoutineJob {
  private fuelClient: FuelClient;
  private env: EnvConfig;
  constructor({
    fuelClient,
    name,
    intervalMs,
    env,
  }: {
    fuelClient: FuelClient;
    name: string;
    intervalMs: number;
    env: EnvConfig;
  }) {
    super(name, intervalMs);

    this.fuelClient = fuelClient;
    this.env = env;
  }

  async execute() {
    this.lastRun = new Date();
    const funderWallet = Wallet.fromPrivateKey(this.env.FUEL_FUNDER_PRIVATE_KEY);

    console.log('executing routine: ', this.name);

    for (const account of accounts) {
      const provider = await this.fuelClient.getProvider();

      const accountWallet = Wallet.fromPrivateKey(account.privateKey, provider);

      let coins = await this.fuelClient.getSmallCoins(
        account.address,
        this.env.MINIMUM_COIN_VALUE
      );

      if (coins.length === 0) {
        continue;
      }

      console.log(`Found ${coins.length} small coins for ${account.address}`);

      if (coins.length > 100) {
        // there is a limit of maximum 255 inputs, we take only 100 as a safety measure
        coins = coins.slice(0, 100);
      }

      const request = new ScriptTransactionRequest();

      let totalCoinValue = bn(0);

      for (const coin of coins) {
        request.addCoinInput(coin);
        totalCoinValue = totalCoinValue.add(coin.amount);
      }

      // reset outputs, as request.addCoinOutput will add a new output
      request.outputs = [];

      request.addCoinOutput(
        funderWallet.address,
        totalCoinValue,
        this.fuelClient.getBaseAssetId()
      );

      request.addChangeOutput(
        funderWallet.address,
        this.fuelClient.getBaseAssetId()
      );

      const result = await provider.estimateTxGasAndFee({
        transactionRequest: request,
      });

      request.maxFee = result.maxFee;
      request.gasLimit = result.maxGas;

      // we find the output coin and set the amount to the total coin value minus the max fee
      request.outputs.forEach((output, index) => {
        if (output.type === 0 && output.assetId === provider.getBaseAssetId()) {
          output.amount = totalCoinValue.sub(result.maxFee);
          request.outputs[index] = output;
        }
      });

      await (await accountWallet.sendTransaction(request)).waitForResult();

      console.log(
        `Sent ${coins.length} small coins to collector for ${account.address}`
      );

      // 200ms
      await sleep(200);
    }
  }
}

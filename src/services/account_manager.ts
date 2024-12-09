import { sleep } from 'bun';
import { envSchema, FuelClient, SupabaseDB } from '../lib';
import type { Database } from '../types';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Address, bn, Provider, ScriptTransactionRequest, Wallet } from 'fuels';
import accounts from '../../accounts.json';

const env = envSchema.parse(process.env);

// We work with the assumption that the account always has a single coin with a great value than the minimum coin value
// Working with a single coin assumption allows us to simplify the logic
const coinManagerProcess = async (
  supabaseDB: SupabaseDB,
  fuelClient: FuelClient
) => {
  // We first fetch all accounts which need funding
  const accountsThatNeedFunding = await supabaseDB.getAccountsThatNeedFunding();
  for (const walletAddress of accountsThatNeedFunding) {
    const coin = await fuelClient.getCoin(
      walletAddress,
      env.MINIMUM_COIN_VALUE
    );

    if (!coin) {
      console.log(`coin not found for ${walletAddress}, funding ...`);

      await fuelClient.fundAccount(walletAddress, env.MINIMUM_COIN_VALUE * 10);

      console.log(
        `Funded ${walletAddress} with ${env.MINIMUM_COIN_VALUE * 10} coins`
      );

      // 200ms
      await sleep(200);
    }

    await supabaseDB.setAccountNeedsFunding(walletAddress, false);
  }

  const unlockedAccounts = await supabaseDB.getUnlockedAccounts();
  console.log(`Found ${unlockedAccounts.length} unlocked accounts`);

  for (const walletAddress of unlockedAccounts) {
    const coin = await fuelClient.getCoin(
      walletAddress,
      env.MINIMUM_COIN_VALUE
    );
    console.log(`Got coin for ${walletAddress}`);

    if (!coin) {
      console.log(`coin not found for ${walletAddress}, funding ...`);

      await fuelClient.fundAccount(walletAddress, env.MINIMUM_COIN_VALUE * 10);
      console.log(
        `Funded ${walletAddress} with ${env.MINIMUM_COIN_VALUE * 10} coins`
      );

      // 200ms
      await sleep(50);
    }
  }

  /// we look for small coins in all accounts, and if they exist we send them to a collector address
  for (const account of accounts) {
    const provider = await fuelClient.getProvider();

    const accountWallet = Wallet.fromPrivateKey(account.privateKey, provider);

    let coins = await fuelClient.getSmallCoins(
      account.address,
      env.MINIMUM_COIN_VALUE
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
      Address.fromAddressOrString(env.FUEL_CHANGE_COLLECTOR_ADDRESS),
      totalCoinValue,
      fuelClient.getBaseAssetId()
    );

    request.addChangeOutput(
      Address.fromAddressOrString(env.FUEL_CHANGE_COLLECTOR_ADDRESS),
      fuelClient.getBaseAssetId()
    );

    const result = await provider.estimateTxGasAndFee({
      transactionRequest: request,
    });

    request.maxFee = result.maxFee;
    request.gasLimit = result.maxGas;

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

  const lockedAccounts = await supabaseDB.getLockedAccounts();

  for (const account of lockedAccounts) {
    const { account: accountData, error: accountError } =
      await supabaseDB.getAccount(account);

    if (accountError) {
      console.error(accountError);
      continue;
    }

    if (accountData.expiry && new Date(accountData.expiry) < new Date()) {
      console.log(`Unlocking account ${account}`);
      await supabaseDB.unlockAccount(account);
    }
  }
};

const main = async () => {
  const supabaseClient: SupabaseClient<Database> = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY
  );

  const supabaseDB = new SupabaseDB(supabaseClient);

  const fuelProvider = await Provider.create(env.FUEL_PROVIDER_URL);

  const fuelClient = new FuelClient({
    provider: fuelProvider,
    funderWallet: Wallet.fromPrivateKey(
      env.FUEL_FUNDER_PRIVATE_KEY,
      fuelProvider
    ),
    minimumCoinValue: env.MINIMUM_COIN_VALUE,
  });

  while (true) {
    try {
      await coinManagerProcess(supabaseDB, fuelClient);
    } catch (error) {
      console.error(error);
    }

    if (env.ENV === 'local') {
      // 5 seconds
      await sleep(5000);
    } else {
      // 30 seconds
      await sleep(30000);
    }
  }
};

main();

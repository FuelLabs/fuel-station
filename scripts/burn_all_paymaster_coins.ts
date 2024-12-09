import { Provider, ScriptTransactionRequest, Wallet } from 'fuels';
import { envSchema } from '../src/lib/schema/config';

// NOTE: This script is commented to preserve the logic for burning coins
// const main = async () => {
//   const env = envSchema.parse(process.env);

//   const provider = await Provider.create(env.FUEL_PROVIDER_URL);
//   const paymasterWallet = Wallet.fromPrivateKey(
//     env.FUEL_PAYMASTER_PRIVATE_KEY,
//     provider
//   );

//   const { coins } = await paymasterWallet.getCoins();

//   if (coins.length === 0) {
//     console.log('no coins to burn');
//     return;
//   }

//   const request = new ScriptTransactionRequest();

//   for (const coin of coins) {
//     request.addCoinInput(coin);
//   }

//   // NOTE: We do this to remove any outputs added by addCoinOutput
//   request.outputs = [];

//   const { gasLimit, maxFee } = await provider.estimateTxGasAndFee({
//     transactionRequest: request,
//   });

//   request.maxFee = maxFee;
//   request.gasLimit = gasLimit;

//   await paymasterWallet.sendTransaction(request);

//   console.log('all coins burned');

//   console.log('balance:', await paymasterWallet.getBalance());
// };

// main();

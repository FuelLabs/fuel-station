import express from 'express';
import { config } from 'dotenv';
import {
  AllocateCoinResponseSchema,
  FuelClient,
  ScriptRequestSignSchema,
  SupabaseDB,
} from './lib';
import { createClient } from '@supabase/supabase-js';
import { envSchema } from './lib/schema/config';
import {
  bn,
  normalizeJSON,
  Provider,
  ScriptTransactionRequest,
  Wallet,
  type Coin,
} from 'fuels';
import accounts from '../accounts.json';
import cors from 'cors';
import type {
  AllocateCoinResponse,
  SignRequest,
  TypedRequest,
  TypedResponse,
} from './types';

config();

const main = async () => {
  const env = envSchema.parse(process.env);

  const supabaseDB = new SupabaseDB(
    createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
  );

  const fuelProvider = await Provider.create(env.FUEL_PROVIDER_URL);
  const funderWallet = Wallet.fromPrivateKey(
    env.FUEL_FUNDER_PRIVATE_KEY,
    fuelProvider
  );
  const paymasterWallet = Wallet.fromPrivateKey(
    env.FUEL_PAYMASTER_PRIVATE_KEY,
    fuelProvider
  );

  const fuelClient = new FuelClient({
    provider: fuelProvider,
    paymasterWallet,
    funderWallet,
    minimumCoinAmount: 1,
    minimumCoinValue: 1,
  });

  const app = express();
  const port = process.env.PORT || 3000;

  // Basic CORS setup
  app.use(
    cors({
      origin: 'http://localhost:5173', // React app's URL
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'healthy' });
  });

  app.post(
    '/allocate-coin',
    async (_req: TypedRequest<{}>, res: AllocateCoinResponse) => {
      // TODO: Implement coin retrieval logic

      let coin: Coin | null = null;
      let address: string | null = null;

      while (!coin) {
        address = await supabaseDB.getNextAccount();
        if (!address) {
          return res.status(404).json({ error: 'No unlocked account found' });
        }

        const result = await fuelClient.getCoin(
          address,
          env.MINIMUM_COIN_AMOUNT
        );
        if (!result) {
          await supabaseDB.setAccountNeedsFunding(address, true);
          continue;
        }

        coin = result;
      }

      if (!address) {
        return res
          .status(404)
          .json({ error: 'No unlocked account found after multiple attempts' });
      }
      if (!coin) {
        return res
          .status(404)
          .json({ error: 'No unlocked coin found after multiple attempts' });
      }

      // Lock the account & the job for 30 seconds
      const lockTimeStamp = new Date(Date.now() + 1000 * 30);

      // Lock the account for 30 seconds
      const lockError = await supabaseDB.lockAccount(address, lockTimeStamp);

      if (lockError) {
        console.error(lockError);
        return res.status(500).json({ error: 'Failed to lock account' });
      }

      const { error: insertError, jobId } = await supabaseDB.insertNewJob(
        address,
        lockTimeStamp
      );
      if (insertError) {
        console.error(insertError);
        return res.status(500).json({ error: 'Failed to insert job' });
      }

      console.log('jobId', jobId);
      console.log('sent coin:', coin);

      const {
        success,
        data: response,
        error,
      } = AllocateCoinResponseSchema.safeParse({
        coin: normalizeJSON(coin),
        jobId,
      });

      if (!success) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to allocate coin' });
      }

      res.status(200).send(response);
    }
  );

  app.post('/sign', async (req: SignRequest, res: SignResponse) => {
    const { success, error, data } = ScriptRequestSignSchema.safeParse(
      req.body
    );

    if (!success) {
      console.error(error);
      return res.status(400).json({ error: 'Invalid request body' });
    }

    console.log('req.body', data);

    const scriptRequest = data.request;

    const jobId = data.jobId;
    console.log('jobId', jobId);

    const { error: getJobError, job } = await supabaseDB.getJob(jobId);
    if (getJobError) {
      console.error(getJobError);
      return res.status(500).json({ error: 'Failed to get job' });
    }

    const { error: getAccountError, account: accountData } =
      await supabaseDB.getAccount(job.address);
    if (getAccountError) {
      console.error(getAccountError);
      return res.status(500).json({ error: 'Failed to get account' });
    }
    if (!accountData) {
      return res.status(404).json({ error: 'Account data not found' });
    }

    // This is to sanity check that the account has not been unlocked by another request and we don't accidentally unlock it
    if (accountData.expiry !== job.expiry) {
      return res.status(400).json({ error: 'Job expired' });
    }

    if (new Date(job.expiry) < new Date()) {
      const unlockError = await supabaseDB.unlockAccount(job.address);

      if (unlockError) {
        console.error(unlockError);
        return res.status(500).json({ error: 'Failed to unlock account' });
      }

      return res.status(400).json({ error: 'Job expired' });
    }

    const account = accounts.find(({ address }) => address === job.address);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const inputCoinsBelongingToAccount = scriptRequest.inputs.filter(
      (input) => {
        if (input.type === 0) {
          if (input.owner === job.address) {
            return true;
          }
        }
      }
    );

    if (!inputCoinsBelongingToAccount) {
      return res.status(400).json({
        error: 'No input coins belonging to account in the script transaction',
      });
    }

    if (inputCoinsBelongingToAccount.length > 1) {
      return res.status(400).json({
        error:
          'More than 1 input coin belonging to account in the script transaction',
      });
    }

    const inputCoin = inputCoinsBelongingToAccount[0];
    if (inputCoin.type !== 0) {
      return res.status(400).json({
        error: 'Input coin is not a coin input',
      });
    }

    const outputCoinsBelongingToAccount = scriptRequest.outputs.filter(
      (output) => {
        if (output.to === job.address) {
          return true;
        }
      }
    );

    if (!outputCoinsBelongingToAccount) {
      return res.status(400).json({
        error: 'No output coins belonging to account in the script transaction',
      });
    }

    if (outputCoinsBelongingToAccount.length > 1) {
      return res.status(400).json({
        error:
          'More than 1 output coin belonging to account in the script transaction',
      });
    }

    const outputCoin = outputCoinsBelongingToAccount[0];
    if (outputCoin.type === 2) {
      return res.status(400).json({
        error: 'Output coin is a change output',
      });
    }

    const wallet = Wallet.fromPrivateKey(account.privateKey, fuelProvider);

    const request = new ScriptTransactionRequest();

    request.type = scriptRequest.type;

    // TODO: do explicit type conversion to remove the ts-ignore
    // we are ts-ignoring, because even with different types, it still works
    // @ts-ignore
    request.gasLimit = scriptRequest.gasLimit;
    // @ts-ignore
    request.script = scriptRequest.script;
    // @ts-ignore
    request.scriptData = scriptRequest.scriptData;
    // @ts-ignore
    request.maxFee = scriptRequest.maxFee;

    request.inputs = scriptRequest.inputs;
    request.outputs = scriptRequest.outputs;

    request.witnesses = scriptRequest.witnesses;

    const witnessIndex = inputCoin.witnessIndex;
    // TODO: Ideally the paymaster needs to search the witness index for providing its signature
    request.witnesses[witnessIndex] = await wallet.signTransaction(request);

    const { gasLimit, gasPrice, maxGas, maxFee } =
      await wallet.provider.estimateTxGasAndFee({
        transactionRequest: request,
      });

    // we add some padding, we need to adjust this
    const maxTotalFee = maxGas.mul(gasPrice).add(maxFee).add(200);

    const isOutputCoinAmountValid = bn(outputCoin.amount).gte(
      bn(inputCoin.amount).sub(maxTotalFee)
    );

    if (!isOutputCoinAmountValid) {
      return res.status(400).json({ error: 'Output coin amount is too low' });
    }

    res.status(200).json({ signature: await wallet.signTransaction(request) });
  });

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
};

main();

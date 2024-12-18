import express from 'express';
import { config } from 'dotenv';
import {
  AllocateCoinResponseSchema,
  findInputCoinTypeCoin,
  findOutputCoinTypeCoin,
  FuelClient,
  ScriptRequestSignSchema,
  setRequestFields,
  SupabaseDB,
} from '../lib';
import { createClient } from '@supabase/supabase-js';
import { envSchema } from '../lib/schema/config';
import {
  bn,
  normalizeJSON,
  Provider,
  ScriptTransactionRequest,
  Wallet,
  type Coin,
} from 'fuels';
import accounts from '../../accounts.json';
import cors from 'cors';
import type {
  AllocateCoinResponse,
  SignRequest,
  SignResponse,
  TypedRequest,
  TypedResponse,
} from '../types';
import { rateLimit, type ClientRateLimitInfo } from 'express-rate-limit';
import { readFileSync } from 'node:fs';
import https from 'node:https';

config();

const allocateCoinRateLimitStore = new Map<string, ClientRateLimitInfo>();

// 10000 in Fuel units
// TODO: move this to .env
const MAX_VALUE_PER_COIN = '0x186A0';

const API_RATE_LIMIT_PER_MINUTE = 100;
const ALLOCATE_COIN_RATE_LIMIT_PER_HOUR = 5;

const ENV = envSchema.parse(process.env);

const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max:
    ENV.ENV === 'local' || ENV.ENV === 'testnet'
      ? 1000
      : API_RATE_LIMIT_PER_MINUTE,
  message: 'Too many requests from this IP, please try again after 1 minute',
  standardHeaders: true,
  legacyHeaders: false,
});

const allocateCoinRateLimit = rateLimit({
  windowMs: 1 * 60 * 60 * 1000, // 1 hour
  max:
    ENV.ENV === 'local' || ENV.ENV === 'testnet'
      ? 1000
      : ALLOCATE_COIN_RATE_LIMIT_PER_HOUR,
  message: 'Too many requests from this IP, please try again after 1 hour',
  standardHeaders: true,
  legacyHeaders: false,
});

const main = async () => {
  const supabaseDB = new SupabaseDB(
    createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY)
  );

  const fuelProvider = await Provider.create(ENV.FUEL_PROVIDER_URL);
  const funderWallet = Wallet.fromPrivateKey(
    ENV.FUEL_FUNDER_PRIVATE_KEY,
    fuelProvider
  );

  const fuelClient = new FuelClient({
    provider: fuelProvider,
    funderWallet,
    minimumCoinValue: 1,
  });

  const app = express();
  const port = process.env.PORT || 3000;

  const isHttps = ENV.SSL_KEY_PATH && ENV.SSL_CERT_PATH;
  console.log('isHttps', isHttps);

  const options = isHttps
    ? {
        key: readFileSync(ENV.SSL_KEY_PATH),
        cert: readFileSync(ENV.SSL_CERT_PATH),
      }
    : {};

  app.set('trust proxy', true);

  // Basic CORS setup
  app.use(
    cors({
      origin: 'http://localhost:5173', // React app's URL
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json());
  app.use(apiRateLimit);

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'healthy' });
  });

  app.post(
    '/allocate-coin',
    allocateCoinRateLimit,
    async (req: TypedRequest<{}>, res: AllocateCoinResponse) => {
      const v = await allocateCoinRateLimit.getKey(req.ip);
      allocateCoinRateLimitStore.set(req.ip, v);

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
          ENV.MINIMUM_COIN_VALUE
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
      // console.log('sent coin:', coin);

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

    const baseAssetId = (await fuelClient.getProvider()).getBaseAssetId();

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

    const inputCoin = findInputCoinTypeCoin(
      scriptRequest,
      job.address,
      baseAssetId
    );
    if (!inputCoin) {
      return res.status(400).json({
        error: 'No input coin belonging to account in the script transaction',
      });
    }

    const outputCoin = findOutputCoinTypeCoin(
      scriptRequest,
      job.address,
      baseAssetId
    );
    if (!outputCoin) {
      return res.status(400).json({
        error: 'No output coin belonging to account in the script transaction',
      });
    }

    if (
      bn(outputCoin.amount).lt(bn(inputCoin.amount).sub(MAX_VALUE_PER_COIN))
    ) {
      return res.status(400).json({
        error: 'Output coin amount is too low',
      });
    }

    const wallet = Wallet.fromPrivateKey(account.privateKey, fuelProvider);

    const request = new ScriptTransactionRequest();

    setRequestFields(request, scriptRequest);

    const signature = (await wallet.signTransaction(request)) as `0x${string}`;

    res.status(200).json({ signature });
  });

  // returns the maximum value that can be used per coin in a request
  // TODO: use zod for the response type and do a safe parse
  app.get(
    '/metadata',
    async (
      req: TypedRequest<void>,
      res: TypedResponse<{
        maxValuePerCoin: `0x${string}`;
        allocateCoinRateLimit: ClientRateLimitInfo | undefined;
      }>
    ) => {
      // 10000 in Fuel units
      res.status(200).json({
        maxValuePerCoin: MAX_VALUE_PER_COIN,
        allocateCoinRateLimit: allocateCoinRateLimitStore.get(req.ip)
          ? allocateCoinRateLimitStore.get(req.ip)
          : {
              totalHits: 0,
            },
      });
    }
  );

  app.post(
    '/jobs/:jobId/complete',
    async (
      req: TypedRequest<{
        txnHash: string;
      }>,
      res: TypedResponse<{ error: string } | { status: 'success' }>
    ) => {
      const { jobId, txnHash } = req.params;

      const { error: getJobError, job } = await supabaseDB.getJob(jobId);
      if (getJobError) {
        console.error(getJobError);
        return res.status(500).json({ error: 'Failed to get job' });
      }

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      if (job.job_status === 'completed') {
        return res.status(400).json({ error: 'Job already completed' });
      }

      const unlockAccountError = await supabaseDB.unlockAccount(job.address);

      if (unlockAccountError) {
        console.error(unlockAccountError);
        return res.status(500).json({ error: 'Failed to unlock account' });
      }

      const updateJobError = await supabaseDB.updateJobStatus(
        jobId,
        'completed'
      );
      if (updateJobError) {
        console.error(updateJobError);
        return res.status(500).json({ error: 'Failed to update job status' });
      }

      return res.status(200).json({ status: 'success' });
    }
  );

  if (isHttps) {
    https.createServer(options, app).listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } else {
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  }
};

try {
  main();
} catch (error) {
  console.error(error);
}

import express, { application } from 'express';
import type { FuelClient, SupabaseDB } from '..';
import { onlyOneInputCoinPolicy, spendingCheckPolicy } from './policies';
import { envSchema } from '../schema/config';
import type { BN, Wallet } from 'fuels';
import accounts from '../../../accounts.json';
import type { SignRequest } from '../../types';
import { readFileSync } from 'node:fs';
import https from 'node:https';
import type http from 'node:http';
import {
  allocateCoinHandler,
  signHandler,
  healthHandler,
  jobCompleteHandler,
} from './handlers';
import { metadataHandler } from './handlers/metadata';

const ENV = envSchema.parse(process.env);

console.log('ENV', ENV.ENV);

export type GasStationServerConfig = {
  port: number;
  supabaseDB: SupabaseDB;
  fuelClient: FuelClient;
  funderWallet: Wallet;
  isHttps: boolean;
  maxValuePerCoin: BN;
};

export type PolicyHandler = (ctx: {
  transactionRequest: SignRequest['body']['request'];
  job: {
    address: string;
    expiry: string;
  };
  fuelClient: FuelClient;
  config: GasStationServerConfig;
}) => Promise<Error | null>;

export class GasStationServer {
  private config: GasStationServerConfig;
  private server: https.Server | http.Server | null = null;
  policyHandlers: PolicyHandler[] = [];

  constructor(config: GasStationServerConfig) {
    this.config = config;

    // default policies added to protect the paymaster
    this.addPolicyHandler(onlyOneInputCoinPolicy);
    this.addPolicyHandler(spendingCheckPolicy);
  }

  addPolicyHandler(policyHandler: PolicyHandler) {
    this.policyHandlers.push(policyHandler);
  }

  async start() {
    const app = express();

    const { port, isHttps } = this.config;

    app.locals.config = this.config;
    app.locals.accounts = accounts;
    app.locals.ENV = ENV;

    console.log('isHttps', isHttps);

    const options = isHttps
      ? {
          key: readFileSync(ENV.SSL_KEY_PATH),
          cert: readFileSync(ENV.SSL_CERT_PATH),
        }
      : {};

    app.set('trust proxy', true);

    app.use(express.json());

    app.get('/health', healthHandler);

    app.get('/metadata', metadataHandler);

    app.post(
      '/allocate-coin',
      // @ts-ignore: TODO: fix handler type
      allocateCoinHandler
    );

    app.post(
      '/sign',
      // @ts-ignore: TODO: fix handler type
      signHandler
    );

    app.post(
      '/jobs/:jobId/complete',
      // @ts-ignore: TODO: fix handler type
      jobCompleteHandler
    );

    const promise = new Promise((resolve) => {
      if (isHttps) {
        this.server = https.createServer(options, app).listen(port, () => {
          console.log(`Server is running on port ${port}`);
          resolve(true);
        });
      } else {
        this.server = app.listen(port, () => {
          console.log(`Server is running on port ${port}`);
          resolve(true);
        });
      }
    });

    await promise;
  }

  async stop() {
    const promise = new Promise((resolve, reject) => {
      if (!this.server) {
        reject(new Error('Server not started'));
        return;
      }

      this.server.close(() => {
        resolve(true);
      });
    });

    await promise;
  }
}

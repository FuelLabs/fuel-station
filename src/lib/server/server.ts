import express from 'express';
import type { FuelClient, SupabaseDB } from '..';
import { envSchema } from '../schema/config';
import type { Wallet } from 'fuels';
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

const MAX_VALUE_PER_COIN = '0x186A0';

const ENV = envSchema.parse(process.env);

console.log('ENV', ENV.ENV);

export type PolicyHandler = (ctx: {
  transactionRequest: SignRequest['body']['request'];
  job: {
    address: string;
    expiry: string;
  };
  env: Zod.infer<typeof envSchema>;
  fuelClient: FuelClient;
}) => Promise<Error | null>;

export type GasStationServerConfig = {
  port: number;
  supabaseDB: SupabaseDB;
  fuelClient: FuelClient;
  funderWallet: Wallet;
  isHttps: boolean;
  policyHandlers: PolicyHandler[];
};

export class GasStationServer {
  private config: GasStationServerConfig;
  private server: https.Server | http.Server | null = null;

  constructor(config: GasStationServerConfig) {
    this.config = config;

    if (!this.config.policyHandlers) {
      this.config.policyHandlers = [];
    }
  }

  async start() {
    const app = express();

    const {
      port,
      supabaseDB,
      fuelClient,
      funderWallet,
      isHttps,
      policyHandlers,
    } = this.config;

    console.log('isHttps', isHttps);

    app.locals.supabaseDB = supabaseDB;
    app.locals.fuelClient = fuelClient;
    app.locals.ENV = ENV;
    app.locals.accounts = accounts;
    app.locals.policyHandlers = policyHandlers;

    const options = isHttps
      ? {
          key: readFileSync(ENV.SSL_KEY_PATH),
          cert: readFileSync(ENV.SSL_CERT_PATH),
        }
      : {};

    app.set('trust proxy', true);

    app.use(express.json());

    app.get('/health', healthHandler);

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

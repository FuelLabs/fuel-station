import express from 'express';
import type { FuelClient } from '..';
import { envSchema } from '../schema/config';
import type { BN, Wallet, WalletUnlocked } from 'fuels';
import https from 'node:https';
import type http from 'node:http';
import {
  allocateCoinHandler,
  signHandler,
  healthHandler,
  jobCompleteHandler,
} from './handlers';
import { metadataHandler } from './handlers/metadata';
import type { FuelStationDatabase } from '../db/database';
import { depositHandler } from './handlers/deposit';

const ENV = envSchema.parse(process.env);

console.log('ENV', ENV);

export type GasStationServerConfig = {
  port: number;
  database: FuelStationDatabase;
  fuelClient: FuelClient;
  funderWallet: Wallet;
  isHttps: boolean;
  maxValuePerCoin: BN;
  accounts: WalletUnlocked[];
};

export class GasStationServer {
  private config: GasStationServerConfig;
  private server: https.Server | http.Server | null = null;

  constructor(config: GasStationServerConfig) {
    this.config = config;
  }

  async start() {
    const app = express();

    const { port, isHttps } = this.config;

    app.locals.config = this.config;
    app.locals.ENV = ENV;

    console.log('isHttps', isHttps);

    // TODO: check if we need this
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

    // @ts-ignore: TODO: fix handler type
    app.post('/deposit', depositHandler);

    const promise = new Promise((resolve) => {
      this.server = app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
        resolve(true);
      });
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

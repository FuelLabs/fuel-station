import express from 'express';
import type { FuelClient } from '..';
import { envSchema } from '../schema/config';
import type { BN, Wallet, WalletUnlocked } from 'fuels';
import type http from 'node:http';
import {
  allocateCoinHandler,
  signHandler,
  healthHandler,
  jobCompleteHandler,
  balanceHandler,
  tokenHandler,
  depositHandler,
} from './handlers';
import type { FuelStationDatabase } from '../db/database';

const ENV = envSchema.parse(process.env);

export type GasStationServerConfig = {
  port: number;
  database: FuelStationDatabase;
  fuelClient: FuelClient;
  funderWallet: Wallet;
  accounts: WalletUnlocked[];
};

export class GasStationServer {
  private config: GasStationServerConfig;
  private server: http.Server | null = null;

  constructor(config: GasStationServerConfig) {
    this.config = config;
  }

  async start() {
    const app = express();

    const { port } = this.config;

    app.locals.config = this.config;
    app.locals.ENV = ENV;

    app.use(express.json());

    app.get('/health', healthHandler);

    app.get('/token', tokenHandler);

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

    // @ts-ignore: TODO: fix handler type
    app.get('/balance/:token', balanceHandler);

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

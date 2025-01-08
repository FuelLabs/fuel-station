import express from 'express';
import {
  AllocateCoinResponseSchema,
  findInputCoinTypeCoin,
  findOutputCoinTypeChange,
  findOutputCoinTypeCoin,
  FuelClient,
  healthHandler,
  jobCompleteHandler,
  ScriptRequestSignSchema,
  setRequestFields,
  SupabaseDB,
} from '..';
import { createClient } from '@supabase/supabase-js';
import { envSchema } from '../schema/config';
import {
  bn,
  normalizeJSON,
  Provider,
  Script,
  ScriptTransactionRequest,
  Wallet,
  type Coin,
} from 'fuels';
import accounts from '../../../accounts.json';
import cors from 'cors';
import type {
  AllocateCoinResponse,
  SignRequest,
  SignResponse,
  TypedRequest,
  TypedResponse,
} from '../../types';
import { rateLimit, type ClientRateLimitInfo } from 'express-rate-limit';
import { readFileSync } from 'node:fs';
import https from 'node:https';
import http from 'node:http';
import axios from 'axios';
import { allocateCoinHandler } from './handlers/allocate_coin';
import { signHandler } from './handlers/sign';

// Middleware to verify reCAPTCHA
const verifyRecaptcha = async (req, res, next) => {
  const recaptchaToken = req.body.recaptchaToken;
  if (!recaptchaToken) {
    return res.status(400).json({ error: 'reCAPTCHA token is required' });
  }

  try {
    // Verify token with Google
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: ENV.CAPTCHA_SECRET_KEY,
          response: recaptchaToken,
        },
      }
    );

    const { success, score, challenge_ts } = response.data;

    if (!success) {
      return res.status(400).json({ error: 'reCAPTCHA verification failed' });
    }

    // Check if the score is above your threshold (0.0 to 1.0)
    if (!success || score < 0.5) {
      return res.status(400).json({ error: 'reCAPTCHA verification failed' });
    }

    // Store score in request for later use if needed
    req.recaptchaScore = score;
    next();
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return res.status(500).json({ error: 'Failed to verify reCAPTCHA' });
  }
};

const allocateCoinRateLimitStore = new Map<string, ClientRateLimitInfo>();

// 10000 in Fuel units
// TODO: move this to .env
const MAX_VALUE_PER_COIN = '0x186A0';

const ENV = envSchema.parse(process.env);

console.log('ENV', ENV.ENV);

const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: ENV.API_RATE_LIMIT_PER_MINUTE,
  message: 'Too many requests from this IP, please try again after 1 minute',
  standardHeaders: true,
  legacyHeaders: false,
});

const allocateCoinRateLimit = rateLimit({
  windowMs: 1 * 60 * 60 * 1000, // 1 hour
  max: ENV.ALLOCATE_COIN_RATE_LIMIT_PER_HOUR,
  message: 'Too many requests from this IP, please try again after 1 hour',
  standardHeaders: true,
  legacyHeaders: false,
});

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
  allowedOrigins: string[];
  enableCaptcha: boolean;
  policyHandlers: PolicyHandler[];
};

export class GasStationServer {
  private config: GasStationServerConfig;
  private server: https.Server | http.Server | null = null;

  constructor(config: GasStationServerConfig) {
    this.config = config;
  }

  async start() {
    const app = express();

    const {
      port,
      supabaseDB,
      fuelClient,
      funderWallet,
      isHttps,
      allowedOrigins,
      enableCaptcha,
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

    // Basic CORS setup
    app.use(
      cors({
        origin: ['http://localhost:5173', ...allowedOrigins], // React app's URL
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Recaptcha-Token'],
      })
    );

    app.use(express.json());
    app.use(apiRateLimit);

    app.get('/health', healthHandler);

    app.post(
      '/allocate-coin',
      enableCaptcha
        ? [verifyRecaptcha, allocateCoinRateLimit]
        : [allocateCoinRateLimit],
      // @ts-ignore: TODO: fix handler type
      allocateCoinHandler
    );

    app.post(
      '/sign',
      enableCaptcha ? [verifyRecaptcha] : [],
      // @ts-ignore: TODO: fix handler type
      signHandler
    );

    app.post(
      '/jobs/:jobId/complete',
      enableCaptcha ? [verifyRecaptcha] : [],
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

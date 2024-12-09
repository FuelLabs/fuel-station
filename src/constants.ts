import { envSchema } from './lib/schema/config';

export const env = envSchema.parse(process.env);

export const ACCOUNT_TABLE_NAME =
  env.ENV === 'local'
    ? 'accounts_local'
    : env.ENV === 'testnet'
      ? 'accounts_testnet'
      : 'accounts_mainnet';

export const JOB_TABLE_NAME =
  env.ENV === 'local'
    ? 'jobs_local'
    : env.ENV === 'testnet'
      ? 'jobs_testnet'
      : 'jobs_mainnet';

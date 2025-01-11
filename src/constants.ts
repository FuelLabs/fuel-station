import { envSchema } from './lib/schema/config';

export const env = envSchema.parse(process.env);

export const ACCOUNT_TABLE_NAME = 'accounts';

export const JOB_TABLE_NAME = 'jobs';

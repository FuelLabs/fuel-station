import { z } from 'zod';

export const envSchema = z.object({
  SUPABASE_URL: z.string(),
  SUPABASE_ANON_KEY: z.string(),
  FUEL_PROVIDER_URL: z.string(),
  FUEL_FUNDER_PRIVATE_KEY: z.string(),
  FUEL_CHANGE_COLLECTOR_ADDRESS: z.string(),
  MINIMUM_COIN_VALUE: z.coerce.number(),
  FUNDING_AMOUNT: z.coerce.number(),
  NUM_OF_ACCOUNTS: z.coerce.number(),
  FUEL_STATION_SERVER_URL: z.string().default('http://localhost:3000'),
  ENV: z.enum(['local', 'testnet', 'mainnet']),
  ALLOWED_ORIGINS: z.string().default(''),
  SSL_KEY_PATH: z.string().default(''),
  SSL_CERT_PATH: z.string().default(''),
  API_RATE_LIMIT_PER_MINUTE: z.coerce.number().default(1000),
  ALLOCATE_COIN_RATE_LIMIT_PER_HOUR: z.coerce.number().default(1000),
  ENABLE_CAPTCHA: z.boolean().default(false),
  CAPTCHA_SECRET_KEY: z.string().default(''),
});

export type EnvConfig = z.infer<typeof envSchema>;

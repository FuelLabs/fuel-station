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
});

export type EnvConfig = z.infer<typeof envSchema>;

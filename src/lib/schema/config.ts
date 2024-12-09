import { z } from 'zod';

export const envSchema = z.object({
  SUPABASE_URL: z.string(),
  SUPABASE_ANON_KEY: z.string(),
  FUEL_PROVIDER_URL: z.string(),
  FUEL_FUNDER_PRIVATE_KEY: z.string(),
  FUEL_CHANGE_COLLECTOR_ADDRESS: z.string(),
  MINIMUM_COIN_VALUE: z.coerce.number(),
  NUM_OF_ACCOUNTS: z.coerce.number(),
  ENV: z.enum(['local', 'testnet', 'mainnet']),
});

export type EnvConfig = z.infer<typeof envSchema>;

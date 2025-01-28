import { z } from 'zod';

export const envSchema = z.object({
  SUPABASE_URL: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  FUEL_STATION_SERVER_URL: z.string().default('http://localhost:3000'),
  FUEL_PROVIDER_URL: z.string(),
  FUEL_FUNDER_PRIVATE_KEY: z.string(),
  FUEL_PAYMASTER_MNEMONIC: z.string(),
  MINIMUM_COIN_VALUE: z.coerce.number(),
  FUNDING_AMOUNT: z.coerce.number(),
  MAX_VALUE_PER_COIN: z.coerce.number(),
  NUM_OF_ACCOUNTS: z.coerce.number().default(100),
  JWT_PRIVATE_KEY: z.string(),
});

export type EnvConfig = z.infer<typeof envSchema>;

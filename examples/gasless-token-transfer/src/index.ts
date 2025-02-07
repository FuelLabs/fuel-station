import { z } from 'zod';

export const gaslessTransferEnvScheme = z.object({
  PROVIDER_URL: z.string(),
  PRIVATE_KEY: z.string(),
  STATION_SERVER_URL: z.string(),
  AUTH_TOKEN: z.string(),
});

export * from './dummy_stablecoin_artifact/contracts';

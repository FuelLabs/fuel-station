import { z } from 'zod';

export const AllocateCoinResponseSchema = z.object({
  coin: z.object({
    id: z.string().startsWith('0x'),
    assetId: z.string().startsWith('0x'),
    amount: z.string().startsWith('0x'),
    owner: z.string().startsWith('0x'),
    blockCreated: z.string().startsWith('0x'),
    txCreatedIdx: z.string().startsWith('0x'),
  }),
  jobId: z.string().uuid(),
});

export const GetSignatureRequestSchema = z.object({
  jobId: z.string().uuid(),
});

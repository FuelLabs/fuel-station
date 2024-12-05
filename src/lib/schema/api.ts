import { z } from 'zod';

const txPointerSchema = z.literal('0x00000000000000000000000000000000');

const InputCoinSchema = z.object({
  id: z.string().startsWith('0x'),
  type: z.literal(0),
  owner: z.string().startsWith('0x'),
  amount: z.string().startsWith('0x'),
  assetId: z.string().startsWith('0x'),
  txPointer: txPointerSchema,
  witnessIndex: z.number(),
});

const InputContractSchema = z.object({
  type: z.literal(1),
  contractId: z.string().startsWith('0x'),
  txPointer: txPointerSchema,
});

// currently only supports coin and contract inputs, but we may want to add more in the future
const InputsSchema = InputCoinSchema.or(InputContractSchema);

const OutputCoinSchema = z.object({
  type: z.literal(0),
  to: z.string().startsWith('0x'),
  amount: z.string().startsWith('0x').or(z.number()),
  assetId: z.string().startsWith('0x'),
});

const OutputChangeSchema = z.object({
  type: z.literal(2),
  to: z.string().startsWith('0x'),
  assetId: z.string().startsWith('0x'),
});

// currently only supports coin and change outputs, but we may want to add more in the future
const OutputsSchema = OutputCoinSchema.or(OutputChangeSchema);

// we only support script transactions for now
export const ScriptRequestSignSchema = z.object({
  request: z.object({
    maxFee: z.string().startsWith('0x'),
    inputs: z.array(InputsSchema),
    outputs: z.array(OutputsSchema),
    witnesses: z.array(z.string().startsWith('0x')),
    type: z.literal(0),
    gasLimit: z.string().startsWith('0x'),
    script: z.string().startsWith('0x'),
    scriptData: z.string().startsWith('0x'),
  }),
  jobId: z.string().uuid(),
});

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

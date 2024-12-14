import { z } from 'zod';

const txPointerSchema = z.literal('0x00000000000000000000000000000000');

export const InputCoinSchema = z.object({
  id: z.string().startsWith('0x'),
  type: z.literal(0),
  owner: z.string().startsWith('0x'),
  amount: z.string().startsWith('0x'),
  assetId: z.string().startsWith('0x'),
  txPointer: txPointerSchema,
  witnessIndex: z.number(),
});

export const InputContractSchema = z.object({
  type: z.literal(1),
  contractId: z.string().startsWith('0x'),
  txPointer: txPointerSchema,
});

// currently only supports coin and contract inputs, but we may want to add more in the future
const InputsSchema = InputCoinSchema.or(InputContractSchema);

export const OutputCoinSchema = z.object({
  type: z.literal(0),
  to: z.string().startsWith('0x'),
  amount: z.string().startsWith('0x').or(z.number()),
  assetId: z.string().startsWith('0x'),
});

export const OutputContractSchema = z.object({
  type: z.literal(1),
  inputIndex: z.number(),
});

export const OutputChangeSchema = z.object({
  type: z.literal(2),
  to: z.string().startsWith('0x'),
  assetId: z.string().startsWith('0x'),
});

// currently only supports coin and change outputs, but we may want to add more in the future
export const OutputsSchema =
  OutputCoinSchema.or(OutputContractSchema).or(OutputChangeSchema);

export const ScriptRequestSchema = z.object({
  maxFee: z.string().startsWith('0x'),
  inputs: z.array(InputsSchema),
  outputs: z.array(OutputsSchema),
  witnesses: z.array(z.string().startsWith('0x')),
  type: z.literal(0),
  gasLimit: z.string().startsWith('0x'),
  script: z.string().startsWith('0x'),
  scriptData: z.string().startsWith('0x'),
});

// we only support script transactions for now
export const ScriptRequestSignSchema = z.object({
  request: ScriptRequestSchema,
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

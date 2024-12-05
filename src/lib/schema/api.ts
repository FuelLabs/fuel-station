import { z } from 'zod';

/*
 maxFee: "0x28b",
  inputs: [
    {
      id: "0x0d4afd5afb39e71e36ee617d2c63da27cbafb4057ca3859b14381d61ddb78e5f0001",
      type: 0,
      owner: "0xe13ee8b33f86ac53d5380bf72593cb1536e5a7208a253651de121b88f0a407cb",
      amount: "0x64",
      assetId: "0x7c5ddf8cf9cfba258850604e1abb77d35986bd4a9c0590878ff900fa22f9fbcd",
      txPointer: "0x00000000000000000000000000000000",
      witnessIndex: 0,
    }, {
      id: "0x8128a4a9067c8b7ea5747ecd5458a11509b72ab887f0cf6e88872662686eda030000",
      type: 0,
      owner: "0x71b87873d7578eec94f50338c67b3d35fdf440c4862b98c71b02f0db310cd21a",
      amount: "0x19f13e2",
      assetId: "0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07",
      txPointer: "0x00000000000000000000000000000000",
      witnessIndex: 1,
    }
  ],
  outputs: [
    {
      type: 0,
      to: "0x698395016bd093f402a46064ddd8269642d8db3b5edc7c9062296409a2fc44fc",
      amount: 10,
      assetId: "0x7c5ddf8cf9cfba258850604e1abb77d35986bd4a9c0590878ff900fa22f9fbcd",
    },
    {
      type: 2,
      to: "0xc635b3b24575bb8a5d3b2546a3d970a286d88a48095aab965a62744811101161",
      assetId: "0x7c5ddf8cf9cfba258850604e1abb77d35986bd4a9c0590878ff900fa22f9fbcd",
    },
    {
      type: 2,
      to: "0x71b87873d7578eec94f50338c67b3d35fdf440c4862b98c71b02f0db310cd21a",
      assetId: "0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07",
    }
  ],
  witnesses: [ "0x844ce3a1eb2f5fc0d65f2bea8be36e19fddc2e05dd975c3cb410673668badbecd52d937b8775293902ef4e5892d5532d3c0478a532bf5b6a3c45284cd07c7330",
    "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
  ],
  type: 0,
  gasLimit: "0x1c8497b",
  script: "0x24000000",
  scriptData: "0x",
}
  */

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
  amount: z.number(),
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

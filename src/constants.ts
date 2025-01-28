import { arrayify, keccak256 } from 'fuels';
import { envSchema } from './lib/schema/config';
import { bytesToHex } from '@noble/curves/abstract/utils';

export const env = envSchema.parse(process.env);

export const ACCOUNT_TABLE_NAME = 'accounts';

export const JOB_TABLE_NAME = 'jobs';

export const ALLOCATE_COIN_MESSAGE = 'Allocate Coin';
export const ALLOCATE_COIN_MESSAGE_HASH = keccak256(
  new Uint8Array(Buffer.from(ALLOCATE_COIN_MESSAGE))
);

export const ALLOCATE_COIN_MESSAGE_HASH_HEX = `0x${bytesToHex(ALLOCATE_COIN_MESSAGE_HASH)}`;

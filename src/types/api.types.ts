import type { Request, Response } from 'express';
import type {
  AllocateCoinResponseSchema,
  ScriptRequestSchema,
  ScriptRequestSignSchema,
} from '../lib';
import type { z } from 'zod';

export interface TypedRequest<T> extends Request {
  body: T;
}

export interface TypedResponse<T> extends Response {
  json: (body: T) => this;
}

export type AllocateCoinResponse = TypedResponse<
  z.infer<typeof AllocateCoinResponseSchema> | { error: string }
>;

export type ScriptRequest = z.infer<typeof ScriptRequestSchema>;
export type ScriptRequestAPI = z.infer<typeof ScriptRequestSignSchema>;

export type SignRequest = TypedRequest<ScriptRequestAPI>;

export type SignResponse = TypedResponse<
  { signature: `0x${string}` } | { error: string }
>;

// TODO: this is temp, we need a proper deposit flow
export type DepositRequest = TypedRequest<{
  publicKey: string;
  balance: number;
}>;

export type DepositResponse = TypedResponse<
  | {
      status: boolean;
    }
  | { error: string }
>;

export type BalanceResponse = TypedResponse<
  | {
      balance: number;
    }
  | { error: string }
>;

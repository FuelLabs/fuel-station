import type { Request, Response } from 'express';
import type {
  AllocateCoinResponseSchema,
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

export type SignRequest = TypedRequest<z.infer<typeof ScriptRequestSignSchema>>;

export type SignResponse = TypedResponse<
  { signature: `0x${string}` } | { error: string }
>;

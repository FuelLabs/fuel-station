import type { Request, Response } from 'express';
import type { AllocateCoinResponseSchema } from '../lib';
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

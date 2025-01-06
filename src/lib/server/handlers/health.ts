import type { Request, Response } from 'express';

export const healthHandler = (_req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy' });
};

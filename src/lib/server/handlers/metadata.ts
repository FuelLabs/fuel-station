import type { Request, Response } from 'express';
import type { BN } from 'fuels';

export const metadataHandler = (req: Request, res: Response) => {
  // TODO: find a way to directly derive this from the typescript compiler, i.e avoid using `as`
  const maxValuePerCoin = req.app.locals.maxValuePerCoin as BN;

  res.status(200).json({ maxValuePerCoin });
};

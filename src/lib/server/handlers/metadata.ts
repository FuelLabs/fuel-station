import type { Request, Response } from 'express';
import type { GasStationServerConfig } from '../server';

export const metadataHandler = (req: Request, res: Response) => {
  // TODO: find a way to directly derive this from the typescript compiler, i.e avoid using `as`
  const config = req.app.locals.config as GasStationServerConfig;
  const { maxValuePerCoin } = config;

  res.status(200).json({ maxValuePerCoin });
};

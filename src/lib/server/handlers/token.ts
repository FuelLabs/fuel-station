import type { Request } from 'express';
import type { TokenResponse } from '../../../types';
import jwt from 'jsonwebtoken';
import type { EnvConfig } from '../../schema/config';

export const tokenHandler = async (req: Request, res: TokenResponse) => {
  // TODO: find a way to directly derive this from the typescript compiler, i.e avoid using `as`
  const config = req.app.locals.ENV as EnvConfig;
  const { JWT_PRIVATE_KEY } = config;

  const token = jwt.sign(
    {
      token: crypto.randomUUID(),
    },
    JWT_PRIVATE_KEY
  );

  res.json({ token });
};

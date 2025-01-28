import { bn } from 'fuels';
import type { DepositRequest, DepositResponse } from '../../../types';
import type { GasStationServerConfig } from '../server';
import type { EnvConfig } from '../../schema/config';
import jwt from 'jsonwebtoken';

export const depositHandler = async (
  req: DepositRequest,
  res: DepositResponse
) => {
  const { token, balance } = req.body;

  // TODO: find a way to directly derive this from the typescript compiler, i.e avoid using `as`
  const config = req.app.locals.config as GasStationServerConfig;
  const { JWT_PRIVATE_KEY } = req.app.locals.ENV as EnvConfig;

  try {
    jwt.verify(token, JWT_PRIVATE_KEY);
  } catch (error) {
    return res.status(401).json({ error: 'invalid token' });
  }

  const { database: supabaseDB } = config;

  const error = await supabaseDB.upsertBalance(token, bn(balance));

  if (error) {
    console.error(error);

    res.status(500).json({
      error: 'failed to upsert balance',
    });

    return;
  }

  res.status(200).json({
    status: true,
  });
};

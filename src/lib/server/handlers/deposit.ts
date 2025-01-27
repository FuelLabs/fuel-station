import { bn } from 'fuels';
import type { DepositRequest, DepositResponse } from '../../../types';
import type { GasStationServerConfig } from '../server';

export const depositHandler = async (
  req: DepositRequest,
  res: DepositResponse
) => {
  const { publicKey, balanace } = req.body;

  // TODO: find a way to directly derive this from the typescript compiler, i.e avoid using `as`
  const config = req.app.locals.config as GasStationServerConfig;
  const { database: supabaseDB } = config;

  const error = await supabaseDB.upsertBalance(publicKey, bn(balanace));

  if (error) {
    console.error(error);
    return res.status(500).json({
      error: 'failed to upsert balance',
    });
  }

  return {
    status: true,
  };
};

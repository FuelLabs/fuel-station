import type { Request } from 'express';
import { type BalanceResponse } from '../../../types/api.types';
import type { GasStationServerConfig } from '../server';

export const balanceHandler = async (req: Request, res: BalanceResponse) => {
  // TODO: find a way to directly derive this from the typescript compiler, i.e avoid using `as`
  const config = req.app.locals.config as GasStationServerConfig;
  const { database: supabaseDB } = config;

  const { publicKey } = req.params;
  if (!publicKey) {
    return res.status(400).json({ error: 'publicKey is required' });
  }

  const balance = await supabaseDB.getBalance(publicKey);
  if (!balance) {
    return res.status(404).json({ error: 'balance not found' });
  }

  return res.status(200).json({ balance: balance.toNumber() });
};

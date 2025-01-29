import type { AllocateCoinRequest, AllocateCoinResponse } from '../../../types';
import { normalizeJSON, type Coin } from 'fuels';
import { AllocateCoinResponseSchema } from '../../schema/api';
import type { envSchema } from '../../schema/config';
import type { GasStationServerConfig } from '../server';
import jwt from 'jsonwebtoken';

export const allocateCoinHandler = async (
  req: AllocateCoinRequest,
  res: AllocateCoinResponse
) => {
  const { token } = req.body;

  // TODO: find a way to directly derive this from the typescript compiler, i.e avoid using `as`
  const config = req.app.locals.config as GasStationServerConfig;
  const { database: supabaseDB, fuelClient } = config;

  const ENV = req.app.locals.ENV as Zod.infer<typeof envSchema>;

  try {
    jwt.verify(token, ENV.JWT_PRIVATE_KEY);
  } catch (error) {
    return res.status(401).json({ error: 'invalid token' });
  }

  let coin: Coin | null = null;
  let address: string | null = null;

  while (!coin) {
    address = await supabaseDB.getNextAccount();
    if (!address) {
      return res.status(404).json({ error: 'No unlocked account found' });
    }

    const result = await fuelClient.getCoin(address, ENV.MINIMUM_COIN_VALUE);
    if (!result) {
      await supabaseDB.setAccountNeedsFunding(address, true);
      continue;
    }

    coin = result;
  }

  if (!address) {
    return res.status(404).json({
      error: 'No unlocked account found after multiple attempts',
    });
  }
  if (!coin) {
    return res
      .status(404)
      .json({ error: 'No unlocked coin found after multiple attempts' });
  }

  // Lock the account & the job for 30 seconds
  const lockTimeStamp = new Date(Date.now() + 1000 * 30);

  // Lock the account for 30 seconds
  const lockError = await supabaseDB.lockAccount(address, lockTimeStamp);

  if (lockError) {
    console.error(lockError);
    return res.status(500).json({ error: 'Failed to lock account' });
  }

  const { error: insertError, jobId } = await supabaseDB.insertNewJob({
    address,
    token,
    expiry: lockTimeStamp,
  });
  if (insertError) {
    console.error(insertError);
    return res.status(500).json({ error: 'Failed to insert job' });
  }

  console.log('jobId', jobId);

  const {
    success,
    data: response,
    error,
  } = AllocateCoinResponseSchema.safeParse({
    coin: normalizeJSON(coin),
    jobId,
  });

  if (!success) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to allocate coin' });
  }

  res.status(200).send(response);
};

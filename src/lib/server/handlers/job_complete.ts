import { bn } from 'fuels';
import type { TypedRequest, TypedResponse } from '../../../types';
import type { GasStationServerConfig } from '../server';

export const jobCompleteHandler = async (
  req: TypedRequest<{
    txnHash: string;
  }>,
  res: TypedResponse<{ error: string } | { status: 'success' }>
) => {
  // TODO: find a way to directly derive this from the typescript compiler, i.e avoid using `as`
  const config = req.app.locals.config as GasStationServerConfig;
  const { database: supabaseDB, fuelClient } = config;

  const { jobId } = req.params;

  const { error: getJobError, job } = await supabaseDB.getJob(jobId);
  if (getJobError) {
    console.error(getJobError);
    return res.status(500).json({ error: 'Failed to get job' });
  }

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.job_status === 'completed') {
    return res.status(400).json({ error: 'Job already completed' });
  }

  // TODO: check if this is even possible? i.e at this point there is no balance in the account
  const previousBalance = (await supabaseDB.getBalance(job.token)) ?? bn(0);

  // check if the transaction didn't happen, if not then re-credit the account
  if (!job.txn_hash) {
    const newBalance = previousBalance.add(job.coin_value_consumed);
    const upsertBalanceError = await supabaseDB.upsertBalance(
      job.token,
      newBalance
    );
    if (upsertBalanceError) {
      console.error(upsertBalanceError);
      return res.status(500).json({ error: 'Failed to update balance' });
    }
  } else {
    const fuelProvider = await fuelClient.getProvider();
    const txn = fuelProvider.getTransaction(job.txn_hash);

    // TODO: we can extract a common function for this logic everywhere
    if (txn === null) {
      const newBalance = previousBalance.add(job.coin_value_consumed);
      const upsertBalanceError = await supabaseDB.upsertBalance(
        job.token,
        newBalance
      );
      if (upsertBalanceError) {
        console.error(upsertBalanceError);
        return res.status(500).json({ error: 'Failed to update balance' });
      }
    }
  }

  const unlockAccountError = await supabaseDB.unlockAccount(job.address);

  if (unlockAccountError) {
    console.error(unlockAccountError);
    return res.status(500).json({ error: 'Failed to unlock account' });
  }

  const updateJobError = await supabaseDB.updateJobStatus(jobId, 'completed');
  if (updateJobError) {
    console.error(updateJobError);
    return res.status(500).json({ error: 'Failed to update job status' });
  }

  return res.status(200).json({ status: 'success' });
};

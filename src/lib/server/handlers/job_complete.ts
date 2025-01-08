import type { TypedRequest, TypedResponse } from '../../../types';
import type { SupabaseDB } from '../../db';

export const jobCompleteHandler = async (
  req: TypedRequest<{
    txnHash: string;
  }>,
  res: TypedResponse<{ error: string } | { status: 'success' }>
) => {
  // TODO: find a way to directly derive this from the typescript compiler, i.e avoid using `as`
  const supabaseDB = req.app.locals.supabaseDB as SupabaseDB;

  const { jobId, txnHash } = req.params;

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

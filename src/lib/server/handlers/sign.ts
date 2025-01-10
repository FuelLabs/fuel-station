import { ScriptTransactionRequest, Wallet } from 'fuels';
import type { SignRequest, SignResponse } from '../../../types';
import type { SupabaseDB } from '../../db';
import type { FuelClient } from '../../fuel';
import { ScriptRequestSignSchema } from '../../schema/api';
import type { envSchema } from '../../schema/config';
import { setRequestFields } from '../../utils';
import type { GasStationServerConfig, PolicyHandler } from '../server';

export const signHandler = async (req: SignRequest, res: SignResponse) => {
  // TODO: find a way to directly derive this from the typescript compiler, i.e avoid using `as`
  const config = req.app.locals.config as GasStationServerConfig & {
    policyHandlers: PolicyHandler[];
  };
  const { database: supabaseDB, fuelClient, policyHandlers } = config;

  const accounts = req.app.locals.accounts as [
    { privateKey: string; address: string },
  ];
  const ENV = req.app.locals.env as Zod.infer<typeof envSchema>;

  const { success, error, data } = ScriptRequestSignSchema.safeParse(req.body);

  if (!success) {
    console.error(error);
    return res.status(400).json({ error: 'Invalid request body' });
  }

  console.log('req.body', data);

  const scriptRequest = data.request;

  const jobId = data.jobId;
  console.log('jobId', jobId);

  const { error: getJobError, job } = await supabaseDB.getJob(jobId);
  if (getJobError) {
    console.error(getJobError);
    return res.status(500).json({ error: 'Failed to get job' });
  }

  const { error: getAccountError, account: accountData } =
    await supabaseDB.getAccount(job.address);
  if (getAccountError) {
    console.error(getAccountError);
    return res.status(500).json({ error: 'Failed to get account' });
  }
  if (!accountData) {
    return res.status(404).json({ error: 'Account data not found' });
  }

  if (!accountData.is_locked) {
    return res.status(400).json({ error: 'Account is not locked' });
  }

  // This is to sanity check that the account has not been unlocked by another request and we don't accidentally unlock it
  if (accountData.expiry !== job.expiry) {
    return res.status(400).json({ error: 'Job expired' });
  }

  if (new Date(job.expiry) < new Date()) {
    const unlockError = await supabaseDB.unlockAccount(job.address);

    if (unlockError) {
      console.error(unlockError);
      return res.status(500).json({ error: 'Failed to unlock account' });
    }

    return res.status(400).json({ error: 'Job expired' });
  }

  const account = accounts.find(({ address }) => address === job.address);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  // check all policy handlers
  for (const policyHandler of policyHandlers) {
    const error = await policyHandler({
      transactionRequest: scriptRequest,
      job,
      config,
      fuelClient,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  // sign the transaction

  const wallet = Wallet.fromPrivateKey(
    account.privateKey,
    await fuelClient.getProvider()
  );
  const request = new ScriptTransactionRequest();

  setRequestFields(request, scriptRequest);

  const signature = (await wallet.signTransaction(request)) as `0x${string}`;

  res.status(200).json({ signature });
};

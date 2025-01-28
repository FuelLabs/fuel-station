import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';
import type { JobStatus } from '../../types';
import { ACCOUNT_TABLE_NAME, JOB_TABLE_NAME } from '../../constants';
import type { FuelStationDatabase } from './database';
import { bn, type BN } from 'fuels';

// TODO: We need to create a DB intefrace which SupabaseDB will implement
export class SupabaseDB implements FuelStationDatabase {
  constructor(private supabaseClient: SupabaseClient<Database>) {}

  async getTotatAccountsCount(): Promise<number> {
    const { count, error } = await this.supabaseClient
      .from(ACCOUNT_TABLE_NAME)
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    return count ?? 0;
  }

  async getUnlockedAccounts(): Promise<string[]> {
    const { data, error } = await this.supabaseClient
      .from(ACCOUNT_TABLE_NAME)
      .select('address')
      .eq('is_locked', false);

    if (error) {
      throw error;
    }

    return data
      .map((account) => account.address!)
      .filter((address): address is string => address != null);
  }

  async unlockAccount(address: string): Promise<PostgrestError | null> {
    const { error } = await this.supabaseClient
      .from(ACCOUNT_TABLE_NAME)
      .update({ is_locked: false, expiry: null })
      .eq('address', address);

    return error;
  }

  async getAccount(
    address: string
  ): Promise<
    | { error: PostgrestError; account: null }
    | { error: null; account: Database['public']['Tables']['accounts']['Row'] }
  > {
    const { data, error } = await this.supabaseClient
      .from(ACCOUNT_TABLE_NAME)
      .select('*')
      .eq('address', address);

    if (error) {
      return { error, account: null };
    }

    const account = data?.[0];
    if (!account?.address || account.is_locked === null) {
      return {
        error: new Error('Invalid account data') as PostgrestError,
        account: null,
      };
    }

    return {
      error: null,
      account: {
        ...account,
        address: account.address,
        is_locked: account.is_locked,
      },
    };
  }

  async isAccountLockExpired(
    address: string
  ): Promise<{ error: PostgrestError | Error | null; expired: boolean }> {
    const { data, error } = await this.supabaseClient
      .from(ACCOUNT_TABLE_NAME)
      .select('expiry')
      .eq('address', address);

    if (error) {
      return { error, expired: false };
    }

    if (!data[0]) {
      return { error: new Error('Account not found'), expired: false };
    }

    if (!data[0].expiry) {
      return { error: new Error('Account expiry not found'), expired: false };
    }

    return { error: null, expired: new Date(data[0].expiry) < new Date() };
  }

  async upsertAccounts(
    addresses: { address: string; isLocked: boolean; needsFunding: boolean }[]
  ): Promise<void> {
    const entries = addresses.map(({ address, isLocked, needsFunding }) => ({
      address,
      is_locked: isLocked,
      needs_funding: needsFunding,
    }));

    const { error } = await this.supabaseClient
      .from(ACCOUNT_TABLE_NAME)
      .upsert(entries, { onConflict: 'address' });

    if (error) {
      throw error;
    }
  }

  // searches for an account, which is not locked, and is not marked as needing funding
  // supbase functiond defined below:
  // CREATE OR REPLACE FUNCTION get_random_next_records()
  // RETURNS TABLE (LIKE accounts) AS $$
  // SELECT * FROM accounts
  // WHERE (is_locked = false OR expiry < CURRENT_TIMESTAMP)
  // AND needs_funding = false;
  // $$ LANGUAGE sql;
  async getNextAccount(): Promise<string | null> {
    const { data, error } = (await this.supabaseClient.rpc(
      'get_random_next_record',
      {}
    )) as unknown as {
      data: Array<{ address: string | null }> | null;
      error: PostgrestError | null;
    };

    if (error) {
      throw error;
    }

    return data?.[0]?.address ?? null;
  }

  async getAccountsThatNeedFunding(): Promise<string[]> {
    const { data, error } = await this.supabaseClient
      .from(ACCOUNT_TABLE_NAME)
      .select('address')
      .eq('needs_funding', true);

    if (error) {
      throw error;
    }

    return data
      .map((account) => account.address!)
      .filter((address): address is string => address != null);
  }

  async getLockedAccounts(): Promise<string[]> {
    const { data, error } = await this.supabaseClient
      .from(ACCOUNT_TABLE_NAME)
      .select('address')
      .eq('is_locked', true);

    if (error) {
      throw error;
    }

    return data
      .map((account) => account.address!)
      .filter((address): address is string => address != null);
  }

  async setAccountNeedsFunding(
    address: string,
    needsFunding: boolean
  ): Promise<void> {
    const { error } = await this.supabaseClient
      .from(ACCOUNT_TABLE_NAME)
      .update({ needs_funding: needsFunding })
      .eq('address', address);

    if (error) {
      throw error;
    }
  }

  async lockAccount(
    address: string,
    expiry: Date
  ): Promise<PostgrestError | null> {
    const { error } = await this.supabaseClient
      .from(ACCOUNT_TABLE_NAME)
      // @ts-ignore
      .update({ is_locked: true, expiry: expiry.toISOString() })
      .eq('address', address);

    return error ?? null;
  }

  async insertNewJob({
    address,
    token,
    expiry,
  }: {
    address: string;
    token: string;
    expiry: Date;
  }): Promise<{ error: PostgrestError | null; jobId: string }> {
    const jobId = crypto.randomUUID();

    const { error } = await this.supabaseClient.from(JOB_TABLE_NAME).insert({
      job_id: jobId,
      address,
      job_status: 'pending',
      expiry: expiry.toISOString(),
      token,
    });

    return { error, jobId };
  }

  async getJob(
    jobId: string
  ): Promise<
    | { error: PostgrestError; job: null }
    | { error: null; job: Database['public']['Tables']['jobs']['Row'] }
  > {
    const { data, error } = await this.supabaseClient
      .from(JOB_TABLE_NAME)
      .select('*')
      .eq('job_id', jobId);

    if (error) {
      return { error, job: null };
    }

    const job = data?.[0];
    if (!job?.address || !job.expiry || !job.job_status) {
      return {
        error: new Error('Invalid job data') as PostgrestError,
        job: null,
      };
    }

    return {
      error: null,
      job: {
        ...job,
        address: job.address,
        expiry: job.expiry,
        job_status: job.job_status,
        token: job.token,
        coin_value_consumed: bn(job.coin_value_consumed),
      },
    };
  }

  async updateJobStatus(
    jobId: string,
    status: JobStatus
  ): Promise<PostgrestError | null> {
    const { error } = await this.supabaseClient
      .from(JOB_TABLE_NAME)
      .update({ job_status: status })
      .eq('job_id', jobId);

    return error ?? null;
  }

  async upsertBalance(
    token: string,
    balance: BN
  ): Promise<PostgrestError | null> {
    let prevBalance = await this.getBalance(token);
    if (!prevBalance) {
      prevBalance = bn(0);
    }

    const { error } = await this.supabaseClient.from('balances').upsert(
      {
        token,
        balance: prevBalance.add(balance).toNumber(),
      },
      { onConflict: 'token' }
    );

    return error;
  }

  async getBalance(token: string): Promise<BN | null> {
    const { data, error } = await this.supabaseClient
      .from('balances')
      .select('balance')
      .eq('token', token);

    if (error) {
      throw error;
    }

    return data?.[0]?.balance ? bn(data[0].balance) : null;
  }
}

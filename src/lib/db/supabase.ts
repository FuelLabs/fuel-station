import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';
import type { JobStatus } from '../../types';
import { ACCOUNT_TABLE_NAME, JOB_TABLE_NAME } from '../../constants';
import { envSchema } from '../schema/config';
import type { Database as DatabaseInterface } from './database';

const env = envSchema.parse(process.env);

// TODO: We need to create a DB intefrace which SupabaseDB will implement
export class SupabaseDB implements DatabaseInterface {
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

    return data.map((account) => account.address);
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

    return { error: null, account: data?.[0] ?? null };
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

  async insertAccounts(addresses: string[]): Promise<void> {
    const entries = addresses.map((address) => ({ address, is_locked: false }));
    const { error } = await this.supabaseClient
      .from(ACCOUNT_TABLE_NAME)
      .insert(entries);

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
    const { data, error } = await this.supabaseClient.rpc(
      env.ENV === 'local'
        ? 'get_random_next_records_local'
        : env.ENV === 'testnet'
          ? 'get_random_next_records_testnet'
          : 'get_random_next_records_mainnet'
    );

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

    return data.map((account) => account.address);
  }

  async getLockedAccounts(): Promise<string[]> {
    const { data, error } = await this.supabaseClient
      .from(ACCOUNT_TABLE_NAME)
      .select('address')
      .eq('is_locked', true);

    if (error) {
      throw error;
    }

    return data.map((account) => account.address);
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

  async insertNewJob(
    address: string,
    expiry: Date
  ): Promise<{ error: PostgrestError | null; jobId: string }> {
    const jobId = crypto.randomUUID();

    const { error } = await this.supabaseClient.from(JOB_TABLE_NAME).insert({
      job_id: jobId,
      address,
      job_status: 'pending',
      expiry: expiry.toISOString(),
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

    return { error: null, job: data?.[0] ?? null };
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
}

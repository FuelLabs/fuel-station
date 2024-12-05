import { PostgrestError, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';
import type { BN } from 'fuels';

// TODO: We need to create a DB intefrace which SupabaseDB will implement
export class SupabaseDB {
  constructor(private supabaseClient: SupabaseClient<Database>) {}

  async getTotatAccountsCount(): Promise<number> {
    const { count, error } = await this.supabaseClient
      .from('accounts')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    return count ?? 0;
  }

  async getUnlockedAccounts(): Promise<string[]> {
    const { data, error } = await this.supabaseClient
      .from('accounts')
      .select('address')
      .eq('is_locked', false);

    if (error) {
      throw error;
    }

    return data.map((account) => account.address);
  }

  async isAccountLockExpired(
    address: string
  ): Promise<{ error: PostgrestError | Error | null; expired: boolean }> {
    const { data, error } = await this.supabaseClient
      .from('accounts')
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
      .from('accounts')
      .insert(entries);

    if (error) {
      throw error;
    }
  }

  async getTotalCoinsCount(): Promise<number> {
    const { count, error } = await this.supabaseClient
      .from('coins')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    return count ?? 0;
  }

  async insertCoins(
    coins: { utxo_id: string; amount: BN | string; is_locked: boolean }[]
  ): Promise<PostgrestError | null> {
    // @ts-ignore
    const { error } = await this.supabaseClient.from('coins').insert(coins);

    if (error) {
      return error;
    }

    return null;
  }

  // searches for an account, which is either not locked or has an expiry date in the past, and is not marked as needing funding
  // supbase functiond defined below:
  // CREATE OR REPLACE FUNCTION get_random_next_records()
  // RETURNS TABLE (LIKE accounts) AS $$
  // SELECT * FROM accounts
  // WHERE (is_locked = false OR expiry < CURRENT_TIMESTAMP)
  // AND needs_funding = false;
  // $$ LANGUAGE sql;
  async getNextAccount(): Promise<string | null> {
    const { data, error } = await this.supabaseClient.rpc(
      'get_random_next_records'
    );

    if (error) {
      throw error;
    }

    return data?.[0]?.address ?? null;
  }

  async getAccountsThatNeedFunding(): Promise<string[]> {
    const { data, error } = await this.supabaseClient
      .from('accounts')
      .select('address')
      .eq('needs_funding', true);

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
      .from('accounts')
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
      .from('accounts')
      // @ts-ignore
      .update({ is_locked: true, expiry: expiry.toISOString() })
      .eq('address', address);

    return error ?? null;
  }

  async getUnlockedCoin(): Promise<{ utxo_id: string; amount: number } | null> {
    const { data, error } = await this.supabaseClient
      .from('coins')
      .select('*')
      .eq('is_locked', false)
      .limit(1);

    if (error) {
      throw error;
    }

    return data?.[0] ?? null;
  }

  async lockCoin(
    utxo_id: string,
    expiry: Date
  ): Promise<PostgrestError | null> {
    const { error } = await this.supabaseClient
      .from('coins')
      .update({ is_locked: true, expiry })
      .eq('utxo_id', utxo_id);

    return error ?? null;
  }

  async unlockCoin(utxo_id: string): Promise<PostgrestError | null> {
    const { error } = await this.supabaseClient
      .from('coins')
      .update({
        is_locked: false,
        expiry: null,
        txn_hash: null,
      })
      .eq('utxo_id', utxo_id);

    return error ?? null;
  }

  async deleteCoin(utxo_id: string): Promise<PostgrestError | null> {
    const { error } = await this.supabaseClient
      .from('coins')
      .delete()
      .eq('utxo_id', utxo_id);

    return error ?? null;
  }

  async insertNewJob(
    address: string,
    expiry: Date
  ): Promise<{ error: PostgrestError | null; jobId: string }> {
    const jobId = crypto.randomUUID();

    const { error } = await this.supabaseClient.from('jobs').insert({
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
      .from('jobs')
      .select('*')
      .eq('job_id', jobId);

    return { error, job: data?.[0] ?? null };
  }

  async updateJobStatus(
    jobId: string,
    status: 'pending' | 'timeout' | 'completed'
  ): Promise<PostgrestError | null> {
    const { error } = await this.supabaseClient
      .from('jobs')
      .update({ job_status: status })
      .eq('job_id', jobId);

    return error ?? null;
  }
}

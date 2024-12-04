import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
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
}

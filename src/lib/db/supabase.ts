import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';
import type { BN } from 'fuels';

// TODO: We need to create a DB intefrace which SupabaseDB will implement
export class SupabaseDB {
  constructor(private supabaseClient: SupabaseClient<Database>) {}

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
}

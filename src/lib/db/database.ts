import type { PostgrestError } from '@supabase/supabase-js';
import type { JobStatus } from '../../types';
import type { BN } from 'fuels';

/**
 * Interface for all database implementations
 * This provides a contract that all database implementations must follow
 */
export interface FuelStationDatabase {
  /**
   * Get total number of accounts in the database
   */
  getTotatAccountsCount(): Promise<number>;

  /**
   * Get all unlocked accounts
   */
  getUnlockedAccounts(): Promise<string[]>;

  /**
   * Unlock a specific account
   */
  unlockAccount(address: string): Promise<PostgrestError | null>;

  /**
   * Get account details by address
   */
  getAccount(address: string): Promise<
    | { error: PostgrestError; account: null }
    | {
        error: null;
        account: {
          address: string;
          expiry: string | null;
          id: number;
          is_locked: boolean;
          needs_funding: boolean | null;
        };
      }
  >;

  /**
   * Check if an account's lock has expired
   */
  isAccountLockExpired(
    address: string
  ): Promise<{ error: PostgrestError | Error | null; expired: boolean }>;

  /**
   * Insert multiple accounts
   */
  upsertAccounts(
    addresses: { address: string; isLocked: boolean; needsFunding: boolean }[]
  ): Promise<void>;

  /**
   * Get next available account for allocation
   */
  getNextAccount(): Promise<string | null>;

  /**
   * Get accounts that need funding
   */
  getAccountsThatNeedFunding(): Promise<string[]>;

  /**
   * Get all currently locked accounts
   */
  getLockedAccounts(): Promise<string[]>;

  /**
   * Set funding status for an account
   */
  setAccountNeedsFunding(address: string, needsFunding: boolean): Promise<void>;

  /**
   * Lock an account with expiry
   */
  lockAccount(address: string, expiry: Date): Promise<PostgrestError | null>;

  /**
   * Insert a new job
   */
  insertNewJob({
    address,
    token,
    expiry,
  }: {
    address: string;
    token: string;
    expiry: Date;
  }): Promise<{ error: PostgrestError | null; jobId: string }>;

  /**
   * Get job details by ID
   */
  getJob(jobId: string): Promise<
    | { error: PostgrestError; job: null }
    | {
        error: null;
        job: {
          address: string;
          expiry: string;
          job_id: string;
          job_status: string;
          txn_hash: string | null;
          token: string;
          prev_balance: BN;
        };
      }
  >;

  /**
   * Update job status
   */
  updateJobStatus(
    jobId: string,
    status: JobStatus
  ): Promise<PostgrestError | null>;

  /**
   * Update job status
   */
  updateTransactionHash(
    jobId: string,
    transactionHash: string
  ): Promise<PostgrestError | null>;

  upsertBalance(publicKey: string, balance: BN): Promise<PostgrestError | null>;

  getBalance(publicKey: string): Promise<BN | null>;

  updateJobCoinValueConsumed(
    jobId: string,
    coinValueConsumed: BN
  ): Promise<PostgrestError | null>;
}

import type { Database } from '../../types';
import type { SupabaseDB } from '../db';
import { Validator } from './index';

export class JobExistsValidator extends Validator<
  string,
  Database['public']['Tables']['jobs_local']['Row']
> {
  private jobId: string;
  private supabaseDB: SupabaseDB;

  constructor(jobId: string, supabaseDB: SupabaseDB) {
    super();
    this.jobId = jobId;
    this.supabaseDB = supabaseDB;
  }

  async validate() {
    const { error: getJobError, job } = await this.supabaseDB.getJob(
      this.jobId
    );
    if (getJobError) {
      console.error(getJobError);
      return new Error('Failed to get job');
    }

    return job;
  }

  getName(): string {
    return 'JobExistsValidator';
  }
}

export type FuelAccount = {
  privateKey: string;
  address: string;
};

export type JobStatus = 'pending' | 'completed' | 'timeout';

export * from './database.types';
export * from './api.types';

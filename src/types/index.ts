export type FuelAccount = {
  privateKey: string;
  address: string;
};

export type JobStatus = 'pending' | 'completed' | 'timeout';

export * from './database.types';
export * from './api.types';

// Define your app.locals interface
interface AppLocals {
  title: string;
  user: {
    id: number;
    name: string;
  };
  config: {
    apiKey: string;
    environment: 'development' | 'production';
  };
}

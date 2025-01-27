// tmp script to test the deposit endpoint

import axios from 'axios';
import { envSchema } from '../src/lib';

// TODO: we can delete this after the endpoint is working, stable and well tested
const main = async () => {
  const env = envSchema.parse(process.env);
  const { FUEL_STATION_SERVER_URL } = env;

  const publicKey = '0xabcdef';
  const balance = 10;
  console.log(`making a deposit of ${balance} eth to address ${publicKey}`);

  const res = await axios.post(`${FUEL_STATION_SERVER_URL}/deposit`, {
    publicKey,
    balance,
  });

  console.log('status', res.data.status);
};

main();

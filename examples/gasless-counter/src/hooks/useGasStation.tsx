import { GasStationClient } from '../../../../src/lib/client';
import { Wallet, Provider } from 'fuels';
import { toast } from 'react-toastify';

export const useGasStation = (providerUrl: string) => {

  const getProvider = async () => {
    if (!providerUrl) throw new Error('Provider URL is missing');
    return await Provider.create(providerUrl);
  };

  const getWallet = (privateKey: string, provider: Provider) => {
    if (!privateKey) throw new Error('Private key is missing');
    return Wallet.fromPrivateKey(privateKey, provider);
  };

  const getGasStationClient = (provider: Provider) => {
    return new GasStationClient(
      import.meta.env.VITE_FUEL_STATION_SERVER_URL,
      provider,
      import.meta.env.VITE_AUTH_TOKEN
    );
  };

  const checkGasBalance = async (gasClient: GasStationClient) => {
    const balance = await gasClient.balance();
    if (!balance || balance <= 0) {
      toast.error('Gas station balance is too low');
      return false;
    }
    return true;
  };

  return {
    getProvider,
    getWallet,
    getGasStationClient,
    checkGasBalance,
  };
};

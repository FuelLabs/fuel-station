import { useState } from 'react';
import { useGasStation } from './useGasStation';
import { CounterContract } from '../sway-api';
import { toast } from 'react-toastify';
import { Address } from 'fuels';

export const useContractTransaction = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { getProvider, getWallet, getGasStationClient, checkGasBalance } =
    useGasStation(
      import.meta.env.VITE_FUEL_PROVIDER_URL
    );

  const handleContractTransaction = async (
    contractId: string | Address,
    privateKey: string,
    scopeFn: (contract: CounterContract) => any,
    onSuccessMsg: string
  ) => {
    setIsLoading(true);

    try {
      const provider = await getProvider();
      const wallet = getWallet(privateKey, provider);
      const contract = new CounterContract(contractId, wallet);
      const gasClient = getGasStationClient(provider);

      const isBalanceSufficient = await checkGasBalance(gasClient);
      if (!isBalanceSufficient) return;

      const scope = scopeFn(contract);
      const txRequest = await scope.getTransactionRequest();
      const txResult = await (
        await gasClient.sendTransaction(txRequest, wallet)
      ).waitForResult();

      if (txResult.status === 'success') {
        toast.success(onSuccessMsg);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return { handleContractTransaction, isLoading };
};

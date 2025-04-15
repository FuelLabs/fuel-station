import { useState, useEffect } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Button from './components/Button';
import { CounterContractFactory, CounterContract } from './sway-api';
import { toast } from 'react-toastify';
import { useContractTransaction } from './hooks/useContractTransaction'; 
import { useGasStation } from './hooks/useGasStation'; 
import { Wallet, createAssetId, ZeroBytes32, Address } from 'fuels';

function App() {
  const [counter, setCounter] = useState<number>();
  const [deployments, setDeployments] = useState<any | null>(null);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);

  const FUEL_PROVIDER_URL = import.meta.env.VITE_FUEL_PROVIDER_URL;
  const FUEL_FUNDER_PRIVATE_KEY = import.meta.env.VITE_FUEL_FUNDER_PRIVATE_KEY;

  const { handleContractTransaction, isLoading } = useContractTransaction();
  const { getProvider } = useGasStation(FUEL_PROVIDER_URL);

  const deployCounterContract = async () => {
    setIsDeploying(true);
    try {
      if (!FUEL_PROVIDER_URL || !FUEL_FUNDER_PRIVATE_KEY) {
        toast.error('FUEL_PROVIDER_URL or PRIVATE_KEY is missing');
        return;
      }

      const provider = await getProvider();
      const wallet = Wallet.fromPrivateKey(FUEL_FUNDER_PRIVATE_KEY, provider);
      const contractFactory = new CounterContractFactory(wallet);
      const { contractId, waitForTransactionId } = await contractFactory.deploy();

      await waitForTransactionId();

      const fuelAccount = Wallet.generate();
      const accountDetails = {
        contractId,
        assetId: createAssetId(contractId, ZeroBytes32),
        fuelAccount: {
          privateKey: fuelAccount.privateKey,
          publicKey: fuelAccount.publicKey,
        },
      };

      setDeployments(accountDetails);
      localStorage.setItem('_fuel_station_deployments', JSON.stringify(accountDetails));
      //await getCount(contractId);
      toast.success('Contract deployed successfully!');
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeploying(false);
    }
  };

  const getCount = async (contractId: string | Address) => {
    try {
      const provider = await getProvider();
      const wallet = Wallet.fromPrivateKey(FUEL_FUNDER_PRIVATE_KEY, provider);
      const contract = new CounterContract(contractId, wallet);
      const result = await contract.functions.get_count().call();
      const functionResult = await result.waitForResult();
      setCounter(functionResult.value.toNumber());
    } catch (error) {
      console.error('Error fetching count:', error);
    }
  };

  const incrementByOne = async () => {
    if (deployments) {
      await handleContractTransaction(
        deployments.contractId,
        deployments.fuelAccount.privateKey,
        (contract) => contract.functions.increment_counter(),
        'Counter increased successfully!'
      );
    }
  };

  const decrementByOne = async () => {
    if (counter === 0) {
      toast.error('Counter cannot be a negative number');
      return;
    }

    if (deployments) {
      await handleContractTransaction(
        deployments.contractId,
        deployments.fuelAccount.privateKey,
        (contract) => contract.functions.decrement_counter(),
        'Counter decreased successfully!'
      );
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('_fuel_station_deployments');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setDeployments(parsed);
        if (parsed.contractId) {
          getCount(parsed.contractId);
        }
      } catch (error) {
        console.error('Error parsing localStorage deployments:', error);
      }
    }
  }, []);

  return (
    <div className="container mx-auto px-4 sm:px-10 md:px-8 lg:px-16 pt-5">
      <Navbar deployments={deployments} setDeployments={setDeployments} />
      <div className="flex flex-col items-center justify-center my-10">
        <span className="text-[#00DB7B] rounded-full border-[1px] border-[#00DB7B] px-4 py-2 text-xs">
          Fuel station gasless counter
        </span>
      </div>

      {!deployments ? (
        <div className="flex flex-col items-center gap-4 justify-center my-10">
          <p className="text-white">
            Please deploy counter contract to continue
          </p>
          <div>
            <Button
              onClick={deployCounterContract}
              className={`flex items-center justify-center gap-2 ${isDeploying ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isDeploying ? (
                <svg width="20" height="20" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="25" cy="25" r="20" stroke="#f3f3f3" strokeWidth="4" fill="none" />
                  <circle cx="25" cy="25" r="20" stroke="#000000" strokeWidth="4" fill="none" strokeLinecap="round">
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0 25 25"
                      to="360 25 25"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                    <animate attributeName="stroke-dasharray" values="0, 125.6;125.6, 125.6" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="stroke-dashoffset" values="0;-125.6" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                </svg>
              ) : (
                'Deploy Contract'
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="text-[5em] text-center text-white font-bold my-15 font-PxGrotesk">{counter}</div>
          <div className="flex gap-4 justify-center items-center">
            <Button onClick={decrementByOne} disabled={isLoading}>
              Decrement
            </Button>
            <Button onClick={incrementByOne} disabled={isLoading}>
              Increment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

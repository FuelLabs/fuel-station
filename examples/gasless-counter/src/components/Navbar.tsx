import { shortenAddress } from '../utils/shortenAddress';
import Button from './Button';

interface Deployments {
  fuelAccount: {
    publicKey: string;
  };
}

const Navbar = ({
  deployments,
  setDeployments,
}: {
  deployments: Deployments;
  setDeployments: (value: Deployments | null) => void;
}) => {

  const deleteDeployment = () => {
    localStorage.removeItem('_fuel_station_deployments');
    setDeployments(null);
  };

  return (
    <div className="max-w-4xl py-5 mx-auto">
      <div className="flex justify-between items-center backdrop-blur-xl p-3 rounded-xl border-[1px] border-[#1d1d1d]">
        <div className="logo px-2">
          <a href="https://fuel.network/" target="_blank" rel="noreferrer">
            <img src="/img/logo.svg" alt="Logo" className="h-10 w-20" />
          </a>
        </div>
        <div>
          {deployments && (
            <div className='flex gap-3'>
              <div className="flex flex-col justify-center px-4 py-2 rounded-md border border-[#1d1d1d]">
                <span className="text-white text-[10px]">Public Address</span>
                <span className="text-white text-sm">
                  {shortenAddress(deployments.fuelAccount.publicKey)}
                </span>
              </div>
              <Button onClick={deleteDeployment}>Delete Deployment</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;

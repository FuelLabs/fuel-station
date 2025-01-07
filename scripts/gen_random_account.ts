import { Wallet } from 'fuels';

// generates a random account and prints the private key and address
const main = async () => {
  const wallet = Wallet.generate();
  console.log(`Private key: ${wallet.privateKey}`);
  console.log(`Address: ${wallet.address}`);
};

main();

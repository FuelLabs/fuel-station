import { Mnemonic } from 'fuels';

const main = () => {
  const mnemonic = Mnemonic.generate();
  console.log('Mnemonic:', mnemonic);
};

main();

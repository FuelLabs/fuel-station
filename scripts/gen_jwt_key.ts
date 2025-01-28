import { generateKeyPairSync } from 'node:crypto';

const main = () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  console.log('privateKey', privateKey);
  console.log('publicKey', publicKey);
};

main();

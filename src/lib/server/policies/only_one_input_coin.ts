import { findInputCoinTypeCoin } from '../../utils';
import type { PolicyHandler } from '../server';

// This policy ensures that the transaction has only one input coin from the paymaster
// This is to prevent user being able to spend other assets by the paymaster account
export const onlyOneInputCoinPolicy: PolicyHandler = async ({
  transactionRequest,
  job,
  fuelClient,
}) => {
  const { address: paymasterAddress } = job;
  const baseAssetId = fuelClient.getBaseAssetId();

  const inputCoin = findInputCoinTypeCoin(
    transactionRequest,
    paymasterAddress,
    baseAssetId
  );

  if (!inputCoin) {
    return new Error(
      `onlyOneInputCoinPolicy: no unique input coin found from paymaster: ${paymasterAddress}`
    );
  }

  return null;
};

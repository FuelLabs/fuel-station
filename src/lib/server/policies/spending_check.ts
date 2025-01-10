import { bn } from 'fuels';
import { findInputCoinTypeCoin, findOutputCoinTypeCoin } from '../../utils';
import type { PolicyHandler } from '../server';

// This policy checks if the transaction request isn't spending more than the max value per coin
// NOTE: It will also fail it there are more than one output coin to the paymaster
export const spendingCheckPolicy: PolicyHandler = async ({
  transactionRequest,
  job,
  fuelClient,
  config,
}) => {
  const { address: paymasterAddress } = job;
  const baseAssetId = fuelClient.getBaseAssetId();
  const { maxValuePerCoin } = config;

  const gasInputCoin = findInputCoinTypeCoin(
    transactionRequest,
    paymasterAddress,
    baseAssetId
  );
  if (!gasInputCoin) {
    return new Error(
      `spendingCheckPolicy: no unique gas input coin found for paymaster ${paymasterAddress}`
    );
  }

  const gasInputCoinAmount = bn(gasInputCoin.amount);

  const outputCoin = findOutputCoinTypeCoin(
    transactionRequest,
    paymasterAddress,
    baseAssetId
  );

  if (!outputCoin) {
    return new Error(
      `spendingCheckPolicy: no unique output coin found for paymaster ${paymasterAddress}`
    );
  }

  const outputCoinAmount = bn(outputCoin.amount);

  if (gasInputCoinAmount.sub(outputCoinAmount).gt(maxValuePerCoin)) {
    return new Error(
      `spendingCheckPolicy: gas input coin amount exceeds max value per coin for paymaster ${paymasterAddress}`
    );
  }

  return null;
};

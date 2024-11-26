import { createConfig } from 'fuels';

export default createConfig({
  contracts: ['example/dummy_stablecoin'],
  output: './example/src/dummy_stablecoin_artifact',
});

/**
 * Check the docs:
 * https://docs.fuel.network/docs/fuels-ts/fuels-cli/config-file/
 */

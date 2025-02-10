# Getting Started

In this chapter, we will enable gasless token transfer via the service. The station software runs over a REST endpoint, and typescript client is available to interact with the service.

The service can be self hosted, or you can use the public instance. For the purpose of this example, we will use the public instance hosted over Fuel testnet.

Look for `gasless-token-transfer` in the `examples` folder at the root of the repository.

The directory structure is as follows:

```
examples/gasless-token-transfer
├── dummy_stable_coin
├── src
    ├── dummy_stable_coin_artifact
    ├── index.ts
├── scripts
    ├── balance.ts
    ├── deploy.ts
    ├── mint.ts
    ├── transfer.ts
    ├── deposit.ts
```

Here, we have a dummy stable coin contract, located in `dummy_stable_coin`. We will use this to test the gasless token transfer.

## Step 0: Basic setup

First, change into the `examples/gasless-token-transfer` directory:

```
cd examples/gasless-token-transfer
```

Then, install the dependencies:

```
bun install
```

## Step 1: Deploy the stable coin

To deploy this stable coin, from the root of the main repository, run the following command:

```
bun run deploy
```

This will deploy the stable coin, and save the details in a `deployments.json` file in the `examples/gasless-token-transfer` directory.

This file contains the contract details and a random fuel address that we can mint the stable coin to and do a gasless transfer from!

## Step 2: Mint the stable coin

To mint the stable coin, from the root of the main repository, run the following command:

```
bun run mint
```

This will mint the stable coin to the fuel address in the `deployments.json` file.

## Step 3: Check the balance:

To check the balance of the stable coin for the fuel address, from the root of the main repository, run the following command:

```
bun run balance
```

This will print the balance of the stable coin for the fuel address. It should be `0x64`

## Step 4: Use the paymaster to do a gasless transfer

The script that performs the gasless transfer is in `examples/gasless-token-transfer/scripts/transfer.ts`.

It uses the paymaster client provided by the fuel station server to perform a gasless transfer.

The scripts does the following:

- create a script transaction with:
  - the stable coin of value `0x64` as input
  - sending `0x64` value of this coin to a random receiver address (so, we are burning the coin)
- Uses the paymaster client to send the transaction

To run the script, do the following:

```
bun run transfer
```

Now, you can check the balance of the stable coin again!

```
bun run balance
```

You will see it is now `0`, which means we were able to transfer the coin without having any eth for gas via the paymaster.

## Understanding the code

Now, let's understand the code of the script that performs the gasless transfer.

### Initializing the gas paymaster client

The first step to using a paymaster is to initialize the paymaster client.

```typescript
const gasStationClient = new GasStationClient(
  env.FUEL_STATION_SERVER_URL,
  provider
);
```

### Preparing the gasless transaction

Once the user has built their transaction, they need to call the `prepareGaslessTransaction` method on the paymaster client, this will return a transaction with the gascoin as input included in the transaction, along with the respective output coins in place!

```
 const { transaction, gasCoin, jobId } =
    await gasStationClient.prepareGaslessTransaction(request);
  request = transaction;
```

If you want to adjust few things with the transaction, you can do that, otherwise you can send the transaction by calling the `sendTransaction` method on the paymaster client.

### Sending the transaction

The gas paymaster client provides a `sendTransaction` method, which will send the transaction to the fuel network, it will also do transaction estimation under the hood, so it can be skipped if need be.

```
  const txResult = await (
    await gasStationClient.sendTransaction({
      transaction: request,
      wallet,
      gasCoin,
      jobId,
    })
  ).waitForResult();
```

The result of the `sendTransaction` method is similar to what `Provider.sendTransaction` returns, so you can use the same methods to check the status of the transaction.

Now, we have some understanding of what this script is doing, let's run it!

From the root of the main repository, run the following command:

```
bun run gasless-token-example-send
```

If you see the logs, we were able to complete a gasless transfer here of this dummy stable coin!

Checking the balance again would reveal that the balance of the stable coin for the fuel address is `0x0`, since it has been transferred to the receiver.

You can run `bun run gasless-token-example-balance` from the project root to check this.

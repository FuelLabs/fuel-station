# Running Fuel Station locally

To run Fuel Station locally, you firstly need to do setup the following:

## Install supabase

We for now use supabase as our database, the reason being you can run supabase locally, as well as it offers a generous free tier. We plan to integrate with other databases in the future.

Install supabase cli: [https://supabase.com/docs/guides/local-development/cli/getting-started](https://supabase.com/docs/guides/local-development/cli/getting-started)

## Install bun

We use bun as our javascript runtime. Installation of the same is required.

Install bun: [https://bun.sh/docs/installation](https://bun.sh/docs/installation)

## Clone the repository

Clone the following repo: [Fuel Station](https://github.com/bajpai244/fuel-station)

```
git clone https://github.com/bajpai244/fuel-station.git
```

## Install dependencies

```
cd fuel-station
bun install
```

## Run supabase locally

**NOTE**: You need to be inside the fuel-station directory to run the following command.

```
supabase start
```

## Generate mnemonic

Fuel station uses mnemonic to generate multiple accounts, which are used to provide gas coins. You need to generate a mnemonic first.

```
bun generate-mnemonic
```

It will generate a mnemonic and save it in the `.env` file, with the key `FUEL_PAYMASTER_MNEMONIC`. Take a look at `.env.example` for refernce

## Setup env variables

You need to setup the following env variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FUEL_PROVIDER_URL`
- `FUEL_STATION_SERVER_URL`
- `FUEL_FUNDER_PRIVATE_KEY`
- `FUEL_PAYMASTER_MNEMONIC`
- `MINIMUM_COIN_VALUE`
- `FUNDING_AMOUNT`
- `MAX_VALUE_PER_COIN`
- `NUM_OF_ACCOUNTS`

You can copy the values from `.env.example` and paste it in your `.env` file, and then replace the values with your own.

small notes on the variables:

- `FUEL_PROVIDER_URL`: This is the url of the fuel-core instance. You can run fuel-core locally by running `fuel-core` in your terminal.
- `FUEL_STATION_SERVER_URL`: This is the url of the fuel-station server. You can run the server by running `bun run dev` in your terminal. default is `http://127.0.0.1:3000`
- `FUEL_FUNDER_PRIVATE_KEY`: This is the private key of the account that will be used to fund the paymaster accounts.
- `FUEL_PAYMASTER_MNEMONIC`: This is the mnemonic that will be used to generate the paymaster accounts.
- `MINIMUM_COIN_VALUE`: This is the minimum balance below which the paymaster account needs to be funded again by funding account.
- `FUNDING_AMOUNT`: This is the amount of coins to fund each paymaster account with.
- `MAX_VALUE_PER_COIN`: This is the maximum value that can be spent per transaction from a gas coin. For example, if this is set to `1000`, then if the paymaster gas coin is worth 5000, then the user can only spend 1000 from the gas coin.
- `NUM_OF_ACCOUNTS`: This is the number of accounts to generate and use as paymaster accounts.

## Run the server

Post the env variables, you can run the server by running the following command:

```
bun run dev
```

Hurray! You have successfully run the fuel station server locally.

Right now, the service is running on `http://127.0.0.1:3000`. 

The gas paymaster for now can allocate a coin and sign over them, in the next chapter we will enable gasless token transfers via the service.
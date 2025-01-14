# What is Fuel Station?

<img src="https://github.com/bajpai244/fuel-station/blob/main/assets/logo.png?raw=true" alt="Fuel Station Logo" style="max-width: 150px;">

Fuel Station is an implementation of a Fuel Paymaster. It is a service that allows applications to sponsor user transactions, for providing ideal user experience to their users.

## How does it work?

Fuel station has multiple accounts that are funded, an user can request for a gas coin from the fuel station. A gas coin is a coin provided by the fuel station to the user, which can be used to pay for the gas fees of the transaction. 

This puts a lock of 30 seconds on the account that provided the gas coin. This is to prevent conflicts with other transactions.

The gas coin can only be spent, if the user has a valid signature from the fuel station. The user builds their transaction, and then sends it back to the fuel station. The fuel station will sign the transaction with one of its accounts, and then send it back to the user. The user can then use the signed transaction to pay for the gas fees of the transaction.

## How do we prevent spam?

Every 30 seconds, the account that provided the gas coin will be unlocked. This is to prevent spam. So, a user of the gas paymaster cannot keep an account locked for a long time.

We recommend using the paymaster behind a reverse proxy like Cloudflare or Nginx to prevent spam. The reverse proxy should be configured to rate limit the requests to the paymaster, and if possible check for captchas.
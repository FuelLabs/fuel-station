<img src="./assets/logo.png" alt="fuel-station" width="100" style="border-radius: 100%;">

# fuel-station

fuel-station is a non-custodial gas paymaster, this repo contains a demo implementation of the mentioned prototype.

<img src="./assets/image.png" alt="fuel-station" width="350">

Read the [post](https://forum.fuel.network/t/fuel-station-gas-paymaster-on-fuel/7078) on the Fuel Forum for more information.

## Read the Book

Read the fuel-station book to understand how it works and how to use it.

`cd fuel-station-book && mdbook serve -p 3001`

If you don't have `mdbook` installed, you can install it by running `cargo install mdbook`.

Then go to your browser and open `http://localhost:3001/` to read the book.

## API Documentation

### GET /health

Returns the health status of the service.

**Response**

```json
{
  "status": "healthy"
}
```

### POST /allocate-coin

Allocates a coin for gas payment. The service will lock an account and its associated coin for 30 seconds.

**Important Notes:**

- The allocated coin will be locked for 30 seconds
- If the transaction is not completed within this timeframe, the coin will be automatically unlocked
- Each request gets a unique jobId that must be used for subsequent operations

**Response**

```json
{
  "coin": {
    "id": "0x...",
    "amount": "0x..."
    // ... other coin details
  },
  "jobId": "uuid"
}
```

**Error Responses:**

- `404`: No unlocked account/coin found
- `500`: Internal server error (database operations failed)

### Sign Transaction

http
POST /sign

Signs a transaction using the allocated coin.

**Request Body:**

```json
{
  "jobId": "uuid",
  "request": {
    // ScriptTransactionRequest object
  }
}
```

**Important Validations:**

- The job must not be expired
- The transaction can only use one input coin from the allocated account
- The output coin amount must not be less than (input amount - MAX_VALUE_PER_COIN)
- Only one output coin belonging to the account is allowed

**Response**

```json
{
  "signature": "0x..."
}
```

**Error Responses:**

- `400`: Invalid request body, expired job, or transaction validation failed
- `404`: Job or account not found
- `500`: Internal server error

### Get Metadata

http
GET /metadata

Returns configuration metadata including maximum value allowed per coin.

**Response**

```json
{
  "maxValuePerCoin": "0x..."
}
```

### Complete Job

http
POST /jobs/:jobId/complete

Marks a job as complete and unlocks the associated account.

**URL Parameters:**

- `jobId`: UUID of the job to complete

**Request Body:**

```json
{
  "txnHash": "0x..."
}
```

**Response**

```json
{
  "status": "success"
}
```

**Error Responses:**

- `400`: Job already completed
- `404`: Job not found
- `500`: Failed to unlock account or update job status

## Important Notes

1. **Transaction Flow:**

   - First call `/allocate-coin` to get a coin and jobId
   - Use the coin in your transaction and call `/sign` with the jobId
   - After transaction is submitted, call `/jobs/:jobId/complete`

2. **Timeouts:**

   - All allocations timeout after 30 seconds
   - Always complete or let jobs timeout to prevent coin lockup

3. **Rate Limiting:**

   - Implement your own rate limiting as needed
   - Service has limited coins available

4. **Error Handling:**

   - Always check for error responses
   - Implement proper retry logic for failed requests
   - Handle timeouts gracefully

5. **Security Considerations:**
   - The service is non-custodial
   - Validate all transaction parameters before signing
   - Monitor for potential abuse patterns

## Example Usage

check the example folder for a complete example of how to use the API.

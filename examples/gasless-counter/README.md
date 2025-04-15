## How to Run the Fuel Station Counter Contract

### Step 1: Set up the Fuel Station
Follow this guide to set up the Fuel Station: [How to set up the Fuel Station](https://github.com/FuelLabs/fuel-station/blob/main/fuel-station-book/src/1_what_is_station.md)

### Step 2: Run a Local Node
Set up a local node on your machine. Refer to the instructions here: [How to set up a local node](https://docs.fuel.network/docs/node-operator/fuel-ignition/local-node/)

### Step 3: Install Dependencies
In the project root directory, run the following command to install necessary packages:
```bun run install```

### Step 4: Start the Local Node and Fuel Station Services
Run `fuel-core` to start your local node, and `start` to start the Fuel Station services. This should be done in the project root directory.

### Step 5: Set Up the Gasless Counter Example
Navigate to the `cd/examples/gasless-counter` directory and run the following command: ```npm install```

### Step 6: Configure Environment Variables
Copy the contents of `cd/examples/gasless-counter/.env.example` and create a new file named `.env.local`. Paste the contents into this file.

### Step 7: Generate an Auth Token
Visit [http://127.0.0.1:3000/token](http://127.0.0.1:3000/token) in your browser to generate a token. Copy this token and replace the placeholder `VITE_AUTH_TOKEN` in `.env.local` with your generated token.

### Step 8: Deposit Funds
Use Postman or any API testing tool to send a `POST` request to the following URL:

#### Request Sample:
```json
{
  "token": "enter the token you generated from the browser",
  "balance": 1000000
}
```

### Step 8:
On the root project folder, run 
```bun run unlock-accounts```

### Step 9:
Start your vite app using 
```npm run dev```
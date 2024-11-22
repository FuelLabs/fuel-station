predicate;

use std::b512::B512;

pub struct ExpectedOutputCoin {
    assetId: b256,
    amount: u64,
    outputAddress: b256,
}

pub struct PaymasterIntent {
    inputCoinUTXOID: b256,
    expectedOutputCoins: Vec<ExpectedOutputCoin>,
}

configurable {
    PUBLIC_KEY: B512 = B512::new(),
}

fn main(intent: PaymasterIntent, signate: B512) -> bool {
    true
}

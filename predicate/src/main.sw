predicate;

pub struct ExpectedOutputCoin {
    assetId: b256,
    amount: u64,
    outputAddress: b256,
}

pub struct PaymasterIntent {
    inputCoinUTXOID: b256,
    expectedOutputCoins: Vec<ExpectedOutputCoin>,
}

fn main() -> bool {
    true
}

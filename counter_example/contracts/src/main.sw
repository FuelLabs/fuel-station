contract;
 
abi Counter {
    #[storage(read, write)]
    fn increase() -> u64;
}
 
// Storage contains all of the state available in the contract 
storage {
    count: u64 = 0,
}
 
// The actual implementation of ABI for the contract
impl Counter for Contract {
    #[storage(read, write)]
    fn increase() -> u64 {
        let count = storage.count.read();
        storage.count.write(count + 1);
        count
    }
}
 
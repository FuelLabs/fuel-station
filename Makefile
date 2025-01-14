init: 
	supabase db reset

book:
	cd fuel-station-book && mdbook serve -p 3001

start: 
	bun run dev

fuel-core:
	fuel-core run --db-type in-memory --debug --starting-gas-price  1  --gas-price-change-percent 2  --min-gas-price 1  --utxo-validation
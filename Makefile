init: 
	supabase db reset

book:
	cd fuel-station-book && mdbook serve -p 3001

start: 
	bun run dev
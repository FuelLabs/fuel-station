init: 
	supabase db reset
	bun run scripts/upload_accounts_to_db.ts

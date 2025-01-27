-- Create balances table (up migration)
create table "public"."balances" (
    "id" bigserial primary key,
    "public_key" text not null unique,
    "balance" numeric(20,8) not null default 0,
    "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    "updated_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add comment to the table
comment on table "public"."balances" is 'Stores account balances associated with public keys';

-- Create index on public_key for faster lookups
create index balances_public_key_idx on public.balances using btree (public_key);

-- Add updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create trigger handle_balances_updated_at
    before update on public.balances
    for each row
    execute function public.handle_updated_at();

-- Admin access policy
CREATE POLICY "Admin full access"
    ON public.balances
    FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');
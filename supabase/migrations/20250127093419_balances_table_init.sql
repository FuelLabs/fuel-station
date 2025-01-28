-- Create balances table (up migration)
create table "public"."balances" (
    "id" bigserial primary key,
    "token" text not null unique,
    "balance" numeric(20,8) not null default 0,
    "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    "updated_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add comment to the table
comment on table "public"."balances" is 'Stores account balances associated with tokens';

-- Create index on token for faster lookups
create index balances_token_idx on public.balances using btree (token);

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
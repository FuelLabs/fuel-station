-- Migration: Create table with int8 ID and boolean fields
-- Created at: 2024-01-11T15:30:00Z

-- Up Migration
CREATE TABLE IF NOT EXISTS public.accounts (
    id INT8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    address TEXT,
    is_locked BOOL DEFAULT false,
    expiry TIMESTAMPTZ NULL,
    needs_funding BOOL DEFAULT false
);

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_accounts_address ON public.accounts(address);
CREATE INDEX IF NOT EXISTS idx_accounts_expiry ON public.accounts(expiry);
CREATE INDEX IF NOT EXISTS idx_accounts_locked_status ON public.accounts(is_locked) WHERE is_locked = true;

-- Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Admin access policy
CREATE POLICY "Admin full access"
    ON public.accounts
    FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

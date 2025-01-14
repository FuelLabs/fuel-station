-- Migration: Create jobs table with admin-only access
-- Created at: 2024-01-11T15:30:00Z

-- Up Migration
CREATE TABLE IF NOT EXISTS public.jobs (
    job_id TEXT PRIMARY KEY,
    address TEXT,
    job_status TEXT,
    expiry TIMESTAMPTZ,
    txn_hash TEXT
);

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(job_status);
CREATE INDEX IF NOT EXISTS idx_jobs_expiry ON public.jobs(expiry);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Create admin-only policy for all operations (read and write)
CREATE POLICY "Admin full access"
    ON public.jobs
    FOR ALL  -- Allows SELECT, INSERT, UPDATE, and DELETE
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');  -- Checks if user has admin role

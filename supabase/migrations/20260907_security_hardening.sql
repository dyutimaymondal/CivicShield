-- ============================================================================
-- CivicShield Security Hardening & Row Level Security (RLS) Migration
-- Enforces:
-- 1. Anti-Injection check constraints
-- 2. Row Level Security (RLS) for reports table
-- 3. Privilege escalation defense (citizens cannot self-resolve reports)
-- 4. Database-level rate limiting trigger (anti-DoS / flood defense)
-- 5. Secure storage policies for report-photos bucket
-- ============================================================================

-- Ensure uuid-ossp or pgcrypto is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create or verify reports table structure with defensive check constraints
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(200),
    description TEXT NOT NULL,
    category VARCHAR(100),
    location VARCHAR(250),
    photo_url TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    severity VARCHAR(50) DEFAULT 'Medium',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Anti-Injection and boundary check constraints
    CONSTRAINT desc_length_check CHECK (char_length(description) >= 5 AND char_length(description) <= 5000),
    CONSTRAINT status_enum_check CHECK (status IN ('pending', 'in_progress', 'resolved', 'dismissed')),
    CONSTRAINT severity_enum_check CHECK (severity IN ('Low', 'Medium', 'High', 'Critical'))
);

-- Index for fast user_id queries and rate-limit lookups
CREATE INDEX IF NOT EXISTS idx_reports_user_created ON public.reports (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status);

-- ============================================================================
-- 2. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid collision
DROP POLICY IF EXISTS "Citizens can select their own reports" ON public.reports;
DROP POLICY IF EXISTS "Citizens can insert their own reports" ON public.reports;
DROP POLICY IF EXISTS "Disallow direct updates by non-admin users" ON public.reports;
DROP POLICY IF EXISTS "Disallow direct deletes by non-admin users" ON public.reports;

-- Policy 1: Citizens can only query their own reports
CREATE POLICY "Citizens can select their own reports"
ON public.reports
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
);

-- Policy 2: Citizens can only insert reports under their own auth.uid(), and status MUST be 'pending'
CREATE POLICY "Citizens can insert their own reports"
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND (status = 'pending' OR status IS NULL)
);

-- Policy 3: Prevent regular users from tampering with, resolving, or deleting reports
-- Only service_role or admin role may update
CREATE POLICY "Disallow direct updates by non-admin users"
ON public.reports
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 4: Only service_role or admin role may delete
CREATE POLICY "Disallow direct deletes by non-admin users"
ON public.reports
FOR DELETE
TO service_role
USING (true);

-- ============================================================================
-- 3. Database-Level Rate Limiting Trigger (Anti-Flood Defense)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_report_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
    recent_submission_count INTEGER;
BEGIN
    -- Check how many reports this user has submitted in the last 5 minutes
    SELECT COUNT(*)
    INTO recent_submission_count
    FROM public.reports
    WHERE user_id = NEW.user_id
      AND created_at >= (now() - INTERVAL '5 minutes');

    -- Restrict to maximum 5 reports per 5 minutes per user
    IF recent_submission_count >= 5 THEN
        RAISE EXCEPTION 'Rate limit exceeded: You cannot submit more than 5 civic reports within a 5-minute window. Please wait before submitting again.'
        USING ERRCODE = 'P0001';
    END IF;

    -- Update timestamps
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_report_rate_limit ON public.reports;
CREATE TRIGGER trg_enforce_report_rate_limit
BEFORE INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.check_report_rate_limit();

-- ============================================================================
-- 4. Storage Bucket Policies for 'report-photos'
-- ============================================================================

-- Create bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-photos', 'report-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Allow authenticated citizens to upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for report photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow citizens to delete their own uploaded photos" ON storage.objects;

-- Storage Policy: Users can only upload into their own UID directory {auth.uid()}/*
CREATE POLICY "Allow authenticated citizens to upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'report-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (
        LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
    )
);

-- Storage Policy: Anyone can view photos (Public Read)
CREATE POLICY "Public read access for report photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'report-photos');

-- Storage Policy: Citizens can delete their own uploaded photos
CREATE POLICY "Allow citizens to delete their own uploaded photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'report-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

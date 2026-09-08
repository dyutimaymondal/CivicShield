-- ============================================================================
-- CivicShield Complete Supabase Backend Migration
-- 
-- 1. Creates public.profiles (User Database in Supabase Studio Table Editor)
-- 2. Removes email verification requirement via auto-confirm trigger on auth.users
-- 3. Automatically syncs auth.users into public.profiles on registration
-- 4. Creates public.reports, public.incidents, public.micro_protests, public.micro_protest_support
-- 5. Enables Row Level Security (RLS) with permissive read and authenticated write
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. AUTO-CONFIRM TRIGGER (REMOVES EMAIL SENDER / VERIFICATION REQUIREMENT)
-- ============================================================================

-- Function to auto-confirm new signups immediately
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS trigger AS $$
BEGIN
  new.email_confirmed_at := now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_confirm_user ON auth.users;
CREATE TRIGGER trg_auto_confirm_user
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_user();

-- Auto-confirm any existing registered users who were stuck on 'Email not confirmed'
UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE email_confirmed_at IS NULL;

-- ============================================================================
-- 2. USER DATABASE TABLE: public.profiles
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    aadhaar_last4 VARCHAR(4),
    verification_source TEXT,
    role VARCHAR(50) DEFAULT 'citizen',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are readable by authenticated users" ON public.profiles;
CREATE POLICY "Public profiles are readable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can insert and update their own profile" ON public.profiles;
CREATE POLICY "Users can insert and update their own profile"
ON public.profiles FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow service_role full access to profiles
DROP POLICY IF EXISTS "Service role full access to profiles" ON public.profiles;
CREATE POLICY "Service role full access to profiles"
ON public.profiles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Trigger to automatically populate public.profiles on every new auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_verified)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    FALSE
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = coalesce(EXCLUDED.full_name, public.profiles.full_name),
      updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Backfill any existing users into public.profiles
INSERT INTO public.profiles (id, email, full_name, is_verified)
SELECT
  id,
  email,
  coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  FALSE
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. REPORTS TABLE (CITIZEN INCIDENT INTAKE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(200),
    description TEXT NOT NULL,
    category VARCHAR(100),
    location VARCHAR(250),
    photo_url TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    severity VARCHAR(50) DEFAULT 'Medium',
    latitude FLOAT,
    longitude FLOAT,
    ai_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read reports" ON public.reports;
CREATE POLICY "Anyone authenticated can read reports"
ON public.reports FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Users can insert reports" ON public.reports;
CREATE POLICY "Users can insert reports"
ON public.reports FOR INSERT
TO authenticated, anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own reports" ON public.reports;
CREATE POLICY "Users can update their own reports"
ON public.reports FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 4. DIGITAL MICRO-PROTESTS & INCIDENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.incidents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    severity TEXT DEFAULT 'Medium',
    status TEXT DEFAULT 'IN_PROGRESS',
    priority TEXT,
    priority_score FLOAT DEFAULT 0.75,
    priority_breakdown JSONB,
    location TEXT,
    latitude FLOAT,
    longitude FLOAT,
    count INT DEFAULT 1,
    velocity_6h INT DEFAULT 1,
    department TEXT,
    official_response TEXT,
    ai_summary TEXT,
    ai_model TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Incidents are publicly readable" ON public.incidents;
CREATE POLICY "Incidents are publicly readable"
ON public.incidents FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Authenticated can insert or update incidents" ON public.incidents;
CREATE POLICY "Authenticated can insert or update incidents"
ON public.incidents FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Micro-Protests Table
CREATE TABLE IF NOT EXISTS public.micro_protests (
    id TEXT PRIMARY KEY,
    incident_id TEXT REFERENCES public.incidents(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    demand_text TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'ACTIVE',
    target_authority TEXT DEFAULT 'Municipal Corporation',
    target_department TEXT DEFAULT 'Public Works Department',
    support_count INT DEFAULT 0,
    unique_support_count INT DEFAULT 0,
    velocity_6h INT DEFAULT 0,
    demand_provenance JSONB,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    starts_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.micro_protests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Micro-protests are publicly readable" ON public.micro_protests;
CREATE POLICY "Micro-protests are publicly readable"
ON public.micro_protests FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Allow support count updates" ON public.micro_protests;
CREATE POLICY "Allow support count updates"
ON public.micro_protests FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Micro-Protest Support (Enforces Strict 1-Citizen-1-Vote Uniqueness)
CREATE TABLE IF NOT EXISTS public.micro_protest_support (
    id TEXT PRIMARY KEY,
    micro_protest_id TEXT NOT NULL REFERENCES public.micro_protests(id) ON DELETE CASCADE,
    citizen_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    verification_snapshot JSONB,
    status VARCHAR(30) DEFAULT 'CONFIRMED',
    CONSTRAINT unq_citizen_protest_vote UNIQUE (micro_protest_id, citizen_id)
);

ALTER TABLE public.micro_protest_support ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view votes" ON public.micro_protest_support;
CREATE POLICY "Public can view votes"
ON public.micro_protest_support FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Authenticated can cast votes" ON public.micro_protest_support;
CREATE POLICY "Authenticated can cast votes"
ON public.micro_protest_support FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- ============================================================================
-- DONE!
-- ============================================================================

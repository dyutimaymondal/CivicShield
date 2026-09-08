-- ============================================================================
-- CivicShield: Digital Micro-Protest, Dynamic Priority & Incident Intelligence
-- Migration: 20260908_civic_intelligence_micro_protest.sql
-- ============================================================================

-- Ensure uuid extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Ensure public.incidents has all required intelligence columns
CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(250) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'NEW',
    severity VARCHAR(50) NOT NULL DEFAULT 'Medium',
    priority VARCHAR(50) NOT NULL DEFAULT 'P2',
    location VARCHAR(250),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    count INTEGER NOT NULL DEFAULT 1,
    priority_score NUMERIC(4, 3) DEFAULT 0.500,
    priority_breakdown JSONB DEFAULT '{}'::jsonb,
    ai_summary TEXT,
    department VARCHAR(100),
    official_response TEXT,
    first_reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for authority prioritization queries
CREATE INDEX IF NOT EXISTS idx_incidents_priority_score ON public.incidents (priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents (status);
CREATE INDEX IF NOT EXISTS idx_incidents_category ON public.incidents (category);

-- Ensure public.reports has foreign key to incidents
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'incident_id'
    ) THEN
        ALTER TABLE public.reports ADD COLUMN incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'latitude'
    ) THEN
        ALTER TABLE public.reports ADD COLUMN latitude NUMERIC(10, 7);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'longitude'
    ) THEN
        ALTER TABLE public.reports ADD COLUMN longitude NUMERIC(10, 7);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'ai_summary'
    ) THEN
        ALTER TABLE public.reports ADD COLUMN ai_summary TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reports_incident ON public.reports (incident_id);

-- 2. Create micro_protests table (P0 Special Focus)
CREATE TABLE IF NOT EXISTS public.micro_protests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
    title VARCHAR(250) NOT NULL,
    demand_text TEXT NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    eligibility_reason TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_authority VARCHAR(150) NOT NULL DEFAULT 'Municipal Corporation',
    target_department VARCHAR(100) NOT NULL DEFAULT 'Public Works Department',
    support_count INTEGER NOT NULL DEFAULT 0,
    unique_support_count INTEGER NOT NULL DEFAULT 0,
    velocity_6h INTEGER NOT NULL DEFAULT 0,
    demand_provenance JSONB DEFAULT '{"source":"AI","confidence":0.90,"human_approved":true}'::jsonb,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ends_at TIMESTAMPTZ,
    last_count_update TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_mp_status CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'CLOSED', 'REJECTED', 'EXPIRED')),
    CONSTRAINT chk_mp_support_nonneg CHECK (support_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_micro_protests_incident ON public.micro_protests (incident_id);
CREATE INDEX IF NOT EXISTS idx_micro_protests_status ON public.micro_protests (status);

-- 3. Create micro_protest_support table with strict uniqueness
CREATE TABLE IF NOT EXISTS public.micro_protest_support (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    micro_protest_id UUID NOT NULL REFERENCES public.micro_protests(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    verification_snapshot JSONB NOT NULL DEFAULT '{"verified": true, "method": "mock_aadhaar"}'::jsonb,
    ip_hash VARCHAR(64),
    status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Prevent any citizen from supporting the same micro-protest campaign multiple times
    CONSTRAINT uq_mp_citizen_support UNIQUE (micro_protest_id, citizen_id)
);

CREATE INDEX IF NOT EXISTS idx_mp_support_campaign ON public.micro_protest_support (micro_protest_id);
CREATE INDEX IF NOT EXISTS idx_mp_support_citizen ON public.micro_protest_support (citizen_id);

-- 4. Create micro_protest_events audit table
CREATE TABLE IF NOT EXISTS public.micro_protest_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    micro_protest_id UUID NOT NULL REFERENCES public.micro_protests(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mp_events_campaign ON public.micro_protest_events (micro_protest_id, created_at DESC);

-- 5. Create general audit_events table
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_events (entity_type, entity_id);

-- 6. Trigger to atomically increment support_count on new support insert
CREATE OR REPLACE FUNCTION public.trg_fn_increment_mp_support()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.micro_protests
    SET support_count = support_count + 1,
        unique_support_count = unique_support_count + 1,
        velocity_6h = velocity_6h + 1,
        last_count_update = now(),
        updated_at = now()
    WHERE id = NEW.micro_protest_id;

    INSERT INTO public.micro_protest_events (micro_protest_id, actor_id, event_type, metadata)
    VALUES (NEW.micro_protest_id, NEW.citizen_id, 'SUPPORT_ADDED', jsonb_build_object('timestamp', now()));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_micro_protest_support_insert ON public.micro_protest_support;
CREATE TRIGGER trg_micro_protest_support_insert
AFTER INSERT ON public.micro_protest_support
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_increment_mp_support();

-- 7. RLS policies for micro_protests and micro_protest_support
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_protests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_protest_support ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_protest_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Public read access for active incidents and micro protests
DROP POLICY IF EXISTS "Public can view incidents" ON public.incidents;
CREATE POLICY "Public can view incidents" ON public.incidents
FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can view active micro-protests" ON public.micro_protests;
CREATE POLICY "Public can view active micro-protests" ON public.micro_protests
FOR SELECT TO public USING (status IN ('ACTIVE', 'PAUSED', 'CLOSED'));

DROP POLICY IF EXISTS "Authenticated citizens can insert support" ON public.micro_protest_support;
CREATE POLICY "Authenticated citizens can insert support" ON public.micro_protest_support
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = citizen_id);

DROP POLICY IF EXISTS "Citizens can view their own supports" ON public.micro_protest_support;
CREATE POLICY "Citizens can view their own supports" ON public.micro_protest_support
FOR SELECT TO authenticated
USING (auth.uid() = citizen_id);

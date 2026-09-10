-- PGTAP_KIND: fixture
-- FDA-028 v4 LOCAL TEST FIXTURE. Never applied to any hosted environment.
-- Creates the dev key store the forward candidate deliberately does NOT create,
-- plus a minimal host schema, so the EXACT shipped functions can be exercised.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.flags(
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  lat double precision, lng double precision, category text, severity int,
  description text, photo_url text, status text, user_id uuid,
  created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.feedback(
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id uuid, category text, body text, contact_email text, platform text,
  created_at timestamptz DEFAULT now());

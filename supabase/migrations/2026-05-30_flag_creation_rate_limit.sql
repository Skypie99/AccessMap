-- Migration: Flag creation rate limit
-- Prevents abuse: max 20 flags per user per 24 hours
-- Apply in Supabase SQL Editor

-- Create a function to check rate limit
CREATE OR REPLACE FUNCTION check_flag_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  flag_count INTEGER;
  rate_limit INTEGER := 20; -- max flags per 24 hours
BEGIN
  -- Count flags created by this user in the last 24 hours
  SELECT COUNT(*)
  INTO flag_count
  FROM public.flags
  WHERE user_id = auth.uid()
    AND created_at > NOW() - INTERVAL '24 hours';

  IF flag_count >= rate_limit THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum % flags per 24 hours', rate_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger on flags table
DROP TRIGGER IF EXISTS enforce_flag_rate_limit ON public.flags;
CREATE TRIGGER enforce_flag_rate_limit
  BEFORE INSERT ON public.flags
  FOR EACH ROW
  EXECUTE FUNCTION check_flag_rate_limit();

-- Add a comment for future maintainers
COMMENT ON FUNCTION check_flag_rate_limit() IS
  'Rate limit: max 20 flags per user per 24 hours. Adjust rate_limit variable to change threshold.';

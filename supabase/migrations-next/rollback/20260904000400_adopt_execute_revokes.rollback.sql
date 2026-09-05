-- Forward restoration for 20260904000400.
--
-- WARNING: this re-opens direct EXECUTE on two trigger-only SECURITY DEFINER
-- functions to PUBLIC and anon — the FDA-010 shape. There is no legitimate
-- reason to run it; it exists only so the rollback set is complete.

grant execute on function public.check_flag_rate_limit() to public, anon;
grant execute on function public.notify_flag_status_webhook() to public, anon;

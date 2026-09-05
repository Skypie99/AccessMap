-- Forward restoration for 20260904000300.
--
-- WARNING: dropping these removes SERVER-SIDE INSERT THROTTLING, including the
-- only global cap on anonymous reporting. Against production this would open
-- the exact hole a prior audit wrongly believed already existed. It exists for
-- rollback completeness only and must never run without Sky's explicit
-- authorization.

drop trigger if exists enforce_global_anon_rate_limit on public.flags;
drop trigger if exists enforce_flag_creation_rate_limit on public.flags;
drop trigger if exists enforce_flag_rate_limit on public.flags;
drop function if exists public.check_global_anon_rate_limit();
drop function if exists public.check_flag_creation_rate_limit();
drop function if exists public.check_flag_rate_limit();

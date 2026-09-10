-- Forward restoration for 20260904000100.
--
-- WARNING: recreating this trigger restores the DOUBLE-POINTS defect. It exists
-- only so the rollback set is complete and rehearsable. There is no scenario in
-- which running it is desirable; if a rollback is ever needed, prefer leaving
-- the duplicate dropped and reverting the caller instead.

create trigger trigger_flag_status_change
  after update of status on public.flags
  for each row
  execute function public.handle_flag_status_change();

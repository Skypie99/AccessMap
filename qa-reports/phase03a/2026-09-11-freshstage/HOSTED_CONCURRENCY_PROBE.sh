#!/bin/bash
# FDA-028 hosted concurrency: parallel callers against the FULL path
# (admission + ledger + real INSERT) on the fresh staging branch.
set -u
SP="$(dirname "$0")"
N="${1:-25}"; ALLOW="${2:-10}"
Q(){ "$SP/fq" -tAq -c "$1"; }
# Drain BEFORE touching window_seconds: the domain guard refuses a window change
# while ledger rows exist, which is exactly what it is for.
Q "delete from limiter.grant; delete from limiter.bucket; delete from public.flags;" >/dev/null
Q "update limiter.config set bucket_allowance=$ALLOW, normal_allowance=$ALLOW, window_seconds=86400, require_public_ip=false;" >/dev/null
OUT="$SP/conc_out.txt"; : > "$OUT"
for i in $(seq 1 $N); do
  ( "$SP/fq" -tAq -c \
     "select decision from limiter.admit_guest_flag_at('198.51.100.200', NULL, 49.88,-119.49,'no_ramp',3,'concurrency probe', now());" \
     >> "$OUT" 2>/dev/null ) &
done
wait
ADM=$(grep -c '^ADMITTED$' "$OUT" || true)
REF=$(grep -c '^REFUSED' "$OUT" || true)
ROWS=$(Q "select count(*) from public.flags;")
UNITS=$(Q "select coalesce(sum(units_consumed),0) from limiter.bucket;")
GRANTS=$(Q "select count(*) from limiter.grant;")
ORPHAN=$(Q "select count(*) from limiter.grant g where not exists (select 1 from limiter.bucket b where b.bucket_key=g.bucket_key and b.window_id=g.window_id);")
echo "  attempts=$N allowance=$ALLOW -> ADMITTED=$ADM REFUSED=$REF"
echo "  real public.flags rows=$ROWS  ledger units=$UNITS  grants=$GRANTS  orphans=$ORPHAN"
if [ "$ADM" = "$ALLOW" ] && [ "$ROWS" = "$ALLOW" ] && [ "$UNITS" = "$ALLOW" ] && [ "$ORPHAN" = "0" ]; then
  echo "  NO OVERSHOOT: admitted == real rows == ledger units == allowance"
else
  echo "  MISMATCH — investigate, do not average away"
fi

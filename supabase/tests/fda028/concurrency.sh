#!/bin/bash
# FDA-028 v4 concurrency: parallel callers against the FULL path (admission +
# ledger + real INSERT). Proves the guest write cannot overshoot the authority.
set -e
PORT="$1"; R="$2"; N="${3:-40}"; ALLOW="${4:-10}"; OUT="$5"
Q(){ psql -h 127.0.0.1 -p $PORT -U v -d t -tAq -c "$1"; }
Q "update limiter.config set bucket_allowance=$ALLOW, normal_allowance=$ALLOW, window_seconds=86400, require_public_ip=false;" >/dev/null
Q "delete from limiter.bucket; delete from public.flags;" >/dev/null
: > "$OUT"
for i in $(seq 1 $N); do
  ( psql -h 127.0.0.1 -p $PORT -U v -d t -tAq -c \
      "select decision from limiter.admit_guest_flag_at('198.51.100.200', NULL, 1,2,'ramp',3,'c', now());" \
      >> "$OUT" 2>/dev/null ) &
done
wait
ADM=$(grep -c '^ADMITTED$' "$OUT" || true)
REF=$(grep -c '^REFUSED' "$OUT" || true)
ROWS=$(Q "select count(*) from public.flags;")
UNITS=$(Q "select coalesce(sum(units_consumed),0) from limiter.bucket;")
GRANTS=$(Q "select count(*) from limiter.grant;")
ORPHAN=$(Q "select count(*) from limiter.grant g where not exists (select 1 from limiter.bucket b where b.bucket_key=g.bucket_key and b.window_id=g.window_id);")
echo "  parallel=$N allowance=$ALLOW -> ADMITTED=$ADM REFUSED=$REF"
echo "  actual public.flags ROWS INSERTED = $ROWS   ledger units = $UNITS   grants = $GRANTS   orphans = $ORPHAN"
if [ "$ADM" = "$ALLOW" ] && [ "$ROWS" = "$ALLOW" ] && [ "$UNITS" = "$ALLOW" ] && [ "$ORPHAN" = "0" ]; then
  echo "  ok    NO OVERSHOOT: admitted == rows inserted == ledger units == allowance"
else
  echo "  FAIL  overshoot or mismatch"; exit 1
fi

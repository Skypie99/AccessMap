#!/usr/bin/env bash
# D8 EXIF check — download each uploaded photo from Supabase Storage and
# confirm it has NO GPS / location metadata. Usage: pass one or more public URLs.
#   ./check-photo-gps.sh "<url1>" "<url2>" ...
set -uo pipefail
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
fail=0
i=0
for url in "$@"; do
  i=$((i+1))
  f="$TMP/photo_$i"
  echo "==================================================================="
  echo "[$i] $url"
  if ! curl -fsSL "$url" -o "$f"; then
    echo "  ⚠️  could not download (check the URL)"; fail=1; continue
  fi
  # Pull every GPS / location / camera-identifying tag exiftool can find.
  hits="$(exiftool -G -a -s "$f" 2>/dev/null | grep -iE 'GPS|Location|DateTimeOriginal|Make|Model|Lens|Serial' || true)"
  if [ -z "$hits" ]; then
    echo "  ✅ PASS — no GPS / location / camera metadata found"
  else
    echo "  ❌ FAIL — found identifying metadata:"
    echo "$hits" | sed 's/^/      /'
    fail=1
  fi
done
echo "==================================================================="
[ "$fail" -eq 0 ] && echo "RESULT: ✅ ALL CLEAN — stripping works" || echo "RESULT: ❌ SOMETHING LEAKED — see above"
exit $fail

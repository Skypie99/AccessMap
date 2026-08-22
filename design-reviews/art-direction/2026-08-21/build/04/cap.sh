#!/bin/zsh
# Capture helper for the GSP-04 sim walk. $1 = capture name (no extension).
UDID=9C9D3ED6-E62F-4A5C-A0C2-D8294D6575AC
OUT="$(cd "$(dirname "$0")" && pwd)/after"
mkdir -p "$OUT"
perl -e 'alarm 40; exec @ARGV' xcrun simctl io "$UDID" screenshot "$OUT/$1.png" >/dev/null 2>&1
echo "$OUT/$1.png"

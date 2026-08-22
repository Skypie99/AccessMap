#!/bin/zsh
# cap.sh <tag> — screenshot the 17e into build/03/after/<tag>.png (full-res @3x)
UDID=9C9D3ED6-E62F-4A5C-A0C2-D8294D6575AC
OUT=/Users/skypie/AccessMap/design-reviews/art-direction/2026-08-21/build/03/after
mkdir -p "$OUT"
perl -e 'alarm 30; exec @ARGV' xcrun simctl io $UDID screenshot "$OUT/$1.png" >/dev/null 2>&1 \
  && echo "captured $1.png" || echo "FAILED $1"

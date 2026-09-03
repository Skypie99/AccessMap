#!/bin/zsh
# Audit helper: wait until the simulator screen changes (or timeout), then save a full-res PNG + a 700px preview.
# usage: snap.sh <udid> <name> [timeout_s]   — writes screenshots/<name>.png and $PREV/<name>.png
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
U=$1; NAME=$2; T=${3:-8}
S=/Users/skypie/AccessMap-deep-audit-20260902/qa-reports/2026-09-02_FlagstoneDeepAudit/screenshots
PREV=${PREV:-/private/tmp/claude-501/-Users-skypie-Library-Application-Support-Claude-scratch-workspaces-c33613f8-b7b5-4c3d-b309-221e8e82c10a-de10261b-e063-47df-a47a-8448c4f835e4-scratch-2026-09-02-f57437/03f8b0f8-12fd-4796-abc6-a9be82923dae/scratchpad/prev}
mkdir -p "$PREV"
tmp=$(mktemp -t snap).png
xcrun simctl io "$U" screenshot "$tmp" >/dev/null 2>&1
h0=$(md5 -q "$tmp")
n=0
while [ $n -lt $((T*2)) ]; do
  sleep 0.5; n=$((n+1))
  xcrun simctl io "$U" screenshot "$tmp" >/dev/null 2>&1
  h1=$(md5 -q "$tmp")
  [ "$h1" != "$h0" ] && break
done
sleep 1.2
xcrun simctl io "$U" screenshot "$S/$NAME.png" >/dev/null 2>&1
sips -Z 700 "$S/$NAME.png" --out "$PREV/$NAME.png" >/dev/null 2>&1
rm -f "$tmp"
echo "saved $NAME (changed=$([ "$h1" != "$h0" ] && echo yes || echo no), waited=${n}x0.5s)"

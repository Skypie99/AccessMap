#!/bin/zsh
# $1 = capture name. Reinstalls fresh, waits out the splash, captures.
U=9C9D3ED6-E62F-4A5C-A0C2-D8294D6575AC
APP="$(cat /tmp/claude-501/-Users-skypie/7acb0865-3b40-4c5b-9835-24457750ef21/scratchpad/apppath.txt)"
perl -e 'alarm 60; exec @ARGV' xcrun simctl uninstall "$U" com.accessmap.app >/dev/null 2>&1
perl -e 'alarm 90; exec @ARGV' xcrun simctl install "$U" "$APP"
perl -e 'alarm 30; exec @ARGV' xcrun simctl privacy "$U" grant location com.accessmap.app >/dev/null 2>&1
perl -e 'alarm 30; exec @ARGV' xcrun simctl launch "$U" com.accessmap.app >/dev/null 2>&1
sleep 9
./cap.sh "$1"

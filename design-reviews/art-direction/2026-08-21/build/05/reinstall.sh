#!/bin/zsh
# Fresh-install helper for the GSP-05 walk. Onboarding is gated by a device-wide
# AsyncStorage flag, so every look at card 1 needs a genuinely fresh install.
UDID=9C9D3ED6-E62F-4A5C-A0C2-D8294D6575AC
APP="$1"
perl -e 'alarm 60; exec @ARGV' xcrun simctl uninstall "$UDID" com.accessmap.app
perl -e 'alarm 90; exec @ARGV' xcrun simctl install "$UDID" "$APP"
perl -e 'alarm 30; exec @ARGV' xcrun simctl privacy "$UDID" grant location com.accessmap.app
perl -e 'alarm 30; exec @ARGV' xcrun simctl launch "$UDID" com.accessmap.app

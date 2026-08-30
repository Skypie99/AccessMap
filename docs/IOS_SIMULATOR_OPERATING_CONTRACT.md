# Flagstone iOS Simulator & Device Hub Operating Contract

Every important claim below is tagged:

- **VERIFIED WORKING** — actually run and observed to succeed in a real session on this machine.
- **VERIFIED FAILURE MODE** — actually hit, diagnosed, and worked around in a real session.
- **UNVERIFIED / FUTURE SETUP** — a reasonable next step or standard pattern that has *not* been exercised on this machine yet. Treat it as a hypothesis, not a fact.

This document exists so no future Claude Code or Codex session has to rediscover Xcode 27's toolchain quirks, Expo's launch behavior, CocoaPods on Xcode 27, `.env` worktree provisioning, or simulator-interaction fallbacks from scratch. It was written immediately after the first real end-to-end pass (VP1 fix3, 2026-08-29), while every command and failure was still fresh and reproducible.

If you are a fresh agent about to touch the iOS simulator on this machine: **read this whole document before running anything.** The last section is a checklist of questions this document must be able to answer without you asking Sky or re-deriving them by trial and error.

---

## 1. Pinned Working Environment

**VERIFIED WORKING** (re-checked live while writing this document, 2026-08-29):

| Fact | Value | How to re-check |
|---|---|---|
| macOS version | `27.0` (beta) | `sw_vers -productVersion` |
| Active `xcode-select` path | `/Users/skypie/Downloads/Xcode-beta.app/Contents/Developer` | `xcode-select -p` |
| Active Xcode version | `27.0`, build `27A5252f` | `xcodebuild -version` |
| Primary simulator | Flagstone Audit iPhone 17 Pro | `xcrun simctl list devices` |
| Primary simulator UDID | `F6B9246F-2B95-4C5C-BC7F-CDD4D3D1E4DC` | same |
| Runtime | iOS 26.5 | same |
| Flagstone bundle ID | `com.accessmap.app` | `app.json` → `ios.bundleIdentifier`; do not "fix" this to match the Flagstone rename — see the root `CLAUDE.md` |

There is a **second, separate stable Xcode installation** on this machine that matters for the GUI layer (see §2):

| Fact | Value |
|---|---|
| Stable Xcode path | `/Applications/Xcode.app` |
| Stable Xcode version | `26.6`, build `17F113` |

Do not assume only one Xcode exists on this machine. `xcode-select -p` tells you which one the CLI (`xcodebuild`, `simctl`) uses — it does **not** tell you which one's GUI app is rendering the simulator window.

---

## 2. The Four Layers — and Which GUI App Is Actually Running

Earlier work assumed Xcode 27 "doesn't have Simulator.app any more, only Device Hub." That's half right and it caused real confusion this session. Here is the verified, precise answer.

**VERIFIED WORKING / VERIFIED FACT:**

```
find "/Users/skypie/Downloads/Xcode-beta.app" -maxdepth 3 -iname "*.app"
```
returns, among others:
```
/Users/skypie/Downloads/Xcode-beta.app/Contents/Applications/DeviceHub.app
```
— confirmed bundle ID `com.apple.dt.Devices`, version `27.0`. **Xcode 27 beta's own GUI app for simulators is `DeviceHub.app`, not `Simulator.app`.** Its `Contents/Developer/` tree has no `Applications/Simulator.app` at all (verified: `ls "$(xcode-select -p)"` shows `Library, Makefiles, Platforms, Toolchains, Tools, usr` — no `Applications`).

But in the actual VP1 fix3 session, the process that was really rendering the visible iPhone window was:
```
ps aux | grep -i "Simulator.app"
→ /Applications/Xcode.app/Contents/Developer/Applications/Simulator.app/Contents/MacOS/Simulator
```
— the **classic Simulator.app, from the separate stable Xcode 26.6 install**, bundle ID `com.apple.iphonesimulator`. `open -a Simulator` resolves to this exact path on this machine (verified via `osascript` alias resolution).

**Why this works at all:** CoreSimulator devices/runtimes live in `~/Library/Developer/CoreSimulator/Devices/` and are shared system-wide, independent of which Xcode's `xcode-select` is active. Either GUI — the beta's `DeviceHub.app` or the stable Xcode's `Simulator.app` — can attach to and display the *same* `F6B9246F-...` device. Which one actually opens depends on what launched it (in this session, the Claude iOS Simulator Control tool's `attach` action opened classic `Simulator.app`, not `DeviceHub.app`).

**The four layers, concretely, on this machine:**

1. **CoreSimulator / runtime / device** — the actual simulated iPhone. Owned by neither Xcode install; lives under `~/Library/Developer/CoreSimulator/`. Controlled by `xcrun simctl`. This layer was **never broken** this session.
2. **GUI frontend displaying the device** — on this machine, verified to be **classic `Simulator.app` from `/Applications/Xcode.app` (26.6)**. `DeviceHub.app` (from the 27 beta) exists and is registered but was **not exercised** this session — treat any claim about it as UNVERIFIED.
3. **Specialized agent simulator-control integration** (the Claude Code iOS Simulator Control tool) — this is a thin automation layer *on top of* layer 2. It crashed mid-session (§16). Its failure says nothing about layers 1 or 2.
4. **General desktop/computer-control layer** — ordinary mouse/keyboard automation aimed at whatever window layer 2 puts on screen. Worked as a fallback once layer 3 died (§17), with caveats (§18).

**Rule:** a failure in layer 3 (the specialized tool) must never be read as "the simulator is broken." Confirm layers 1–2 independently via plain `simctl` commands (§14) before concluding anything is actually down.

---

## 3. Golden Five-Minute Preflight

**VERIFIED WORKING**, reconstructed from the commands actually run this session:

```bash
# 1. Confirm the developer directory the CLI toolchain will use
xcode-select -p
# expect: /Users/skypie/Downloads/Xcode-beta.app/Contents/Developer

# 2. Confirm xcodebuild resolves and reports the expected version
xcodebuild -version
# expect: Xcode 27.0 / Build version 27A5252f

# 3. Confirm the target simulator exists and its current boot state
xcrun simctl list devices | grep F6B9246F-2B95-4C5C-BC7F-CDD4D3D1E4DC
# "(Booted)" is fine — do NOT reboot a booted simulator just for ritual.
# "(Shutdown)" is also fine — boot it:
xcrun simctl boot F6B9246F-2B95-4C5C-BC7F-CDD4D3D1E4DC   # no-ops loudly if already booted; ignore that error

# 4. Confirm a GUI can actually display it (only needed if you'll interact visually)
open -a Simulator
# On this machine this opens /Applications/Xcode.app's classic Simulator.app (§2).
```

Do not treat "Unable to boot device in current state: Booted" from step 4's implicit boot as an error — it means step 3 already succeeded. This exact confusion ("is an already-booted simulator a problem?") wasted time before; it is explicitly **not** a blocker (§27).

---

## 4. Exact-Candidate Provenance Rule

**This is mandatory and was the root cause of the biggest wasted detour this session** (see §11, §16 for what it cost). An already-installed Flagstone app on the simulator is **never** proof that your current code changes are the ones rendering. Screens, layouts, and copy in an old build can look plausible and still be wrong.

The golden rule:

```
VERIFY SHA  →  BUILD FROM THAT EXACT WORKTREE  →  INSTALL FRESH BUILD  →  LAUNCH THAT BUILD  →  RECORD EVIDENCE
```

Concretely, **VERIFIED WORKING** sequence:

```bash
# 1. Fetch and confirm you're exactly where you think you are
git fetch origin
git rev-parse HEAD                       # record this — it goes in your evidence manifest
git status --short                       # must be empty (clean) before you build for acceptance
git branch --show-current

# 2. Build fresh (see §10/§12 for the exact xcodebuild invocation)

# 3. Confirm the build product's existence AND freshness
ls -la ios/build/Build/Products/Debug-iphonesimulator/Flagstone.app
# compare its mtime to `date` — a build product from an hour ago while you just
# rebuilt is a sign the build didn't actually replace the old one.

# 4. Install the FRESH .app explicitly by path — never rely on an app already
#    being on the simulator
xcrun simctl install F6B9246F-2B95-4C5C-BC7F-CDD4D3D1E4DC \
  ios/build/Build/Products/Debug-iphonesimulator/Flagstone.app

# 5. Verify the bundle actually landed and check its reported version/build
xcrun simctl listapps F6B9246F-2B95-4C5C-BC7F-CDD4D3D1E4DC | grep -A6 com.accessmap.app
# CFBundleShortVersionString / CFBundleVersion here are the best free "is this
# the build I think it is" signal simctl gives you.

# 6. Launch fresh — terminate first so you can tell a genuine relaunch apart
#    from an already-running stale process
xcrun simctl terminate F6B9246F-2B95-4C5C-BC7F-CDD4D3D1E4DC com.accessmap.app   # OK if it errors "nothing to terminate"
xcrun simctl launch F6B9246F-2B95-4C5C-BC7F-CDD4D3D1E4DC com.accessmap.app
```

**A pre-existing Flagstone app on the simulator is never candidate proof.** If you didn't personally build → install → launch it in this session, treat whatever's on screen as unknown provenance.

---

## 5. Worktree `.env` Requirement

**VERIFIED FAILURE MODE**, then **VERIFIED WORKING** recovery.

Failure observed: a freshly created git worktree had no `.env` (it's gitignored — every worktree needs its own copy). The app built and launched, then immediately red-screened:

```
Uncaught Error
Supabase env vars are missing. Set EXPO_PUBLIC_SUPABASE_URL and
EXPO_PUBLIC_SUPABASE_ANON_KEY — locally in .env, and in EAS via `eas env:create`.
```

Recovery, safe and verified:

```bash
# Confirm an already-authorized local .env exists somewhere trustworthy —
# the main repo checkout or a sibling worktree. Never invent values.
test -f /Users/skypie/AccessMap/.env && echo "found"

# Copy FILE-TO-FILE. Never cat/echo it — that would print secret values into
# a transcript or log.
cp /Users/skypie/AccessMap/.env /path/to/this/worktree/.env

# Confirm only presence/size, never contents:
test -f .env && wc -c < .env      # a byte count is fine to report; the values are not

# Metro reads/inlines EXPO_PUBLIC_* vars via its babel/dotenv plugin at
# process-start time, not per-request. A Metro process that was already
# running BEFORE you copied .env will NOT pick it up — restart it:
pkill -f "expo start --port 8081"
nohup npx expo start --port 8081 > /path/to/metro.log 2>&1 &
# confirm in the log:
grep "env: load .env\|env: export" /path/to/metro.log
```

Rules, non-negotiable:

- Each git worktree may need its own gitignored `.env`. Do not assume it carried over.
- **Never** display `.env` contents in chat, logs, or commit messages. Checking existence/size/permissions is fine; `cat`/`echo`-ing the file is not, even "just to verify."
- Copying an already-authorized local `.env` file-to-file between trusted local locations (main repo ↔ worktree) is safe and was the exact recovery used. This is not the same as fabricating or requesting credentials.
- Confirm `.env` stays untracked (`git status --short` shows nothing for it) and is never committed.
- After provisioning, **restart Metro** (Debug+Metro path) or **rebuild** (Release path, since env vars get inlined at build time there) — whichever mode you're using.

---

## 6. Dependency Install

**VERIFIED WORKING:**

```bash
npm install --legacy-peer-deps
```

Why `--legacy-peer-deps`: `react-leaflet` 5 (used for the web build) wants React `^19.2.6`; Expo SDK 54 pins React 19.1.0. It works fine on 19.1 — the flag is just there to stop npm from refusing the install over the peer-dep mismatch. This is documented project-wide in the root `CLAUDE.md`; it is not an iOS-specific quirk, but you need it before any iOS build too, since the same `node_modules` serves both.

**When it's needed:** only when `node_modules/` doesn't exist yet or is known-broken (e.g., a brand-new worktree, confirmed this session by `node_modules` being entirely absent). **Do not reinstall on every run** — if `node_modules/` is already present and `npm run typecheck` or a prior build succeeded, skip this step. Re-running it costs real time for zero benefit on a healthy worktree.

---

## 7. Expo Prebuild

**VERIFIED WORKING:**

```bash
npx expo prebuild --platform ios --no-install
```

- `ios/` is **gitignored** (confirmed: `.gitignore` line `/ios`). It is fully disposable generated output — CNG (Continuous Native Generation) regenerates it from `app.json` + config plugins on every fresh prebuild.
- Regeneration is necessary whenever `ios/` doesn't exist yet in the current worktree (it won't, in a fresh worktree — worktrees don't share `ios/` any more than they share `node_modules/` or `.env`).
- **Everything under `ios/` is disposable** except the files config-plugins actually read from outside it (`app.json`, `plugins/*.js`). Never hand-edit tracked source expecting an `ios/` change to persist across a re-prebuild — it won't, by design (see §9 for the one documented exception: a *local, gitignored* Podfile patch that must be re-applied after every fresh prebuild).
- **Warning:** because `ios/` is gitignored, it is structurally impossible for it to "contaminate" a tracked diff by accident through normal `git add`/`git commit` of specific files — but always sanity-check `git status --short` before committing anything after a native-build session anyway, since a moment of `git add -A` habit would be the one way to do it.
- `--no-install` skips the automatic `pod install` so you can run it separately with the UTF-8 workaround (§8) in one deliberate step instead of two automatic ones.

**Do not** rely on Expo's own auto-launch-the-simulator behavior as your primary path under Xcode 27 — see §24.

---

## 8. CocoaPods UTF-8 Locale Fix

**VERIFIED WORKING:**

```bash
cd ios && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install
```

This session's `pod install` runs actually succeeded without hitting the classic CocoaPods "invalid byte sequence" / encoding crash that command-scoped `LANG`/`LC_ALL` is the known fix for — but the flags were applied defensively per prior established practice for this repo, and both `pod install` runs (initial + post-Podfile-fix) completed cleanly with them in place. Keep using them; they're cheap insurance and command-scoped, not a global shell change.

**Do not** modify the global shell locale (`~/.zshrc` etc.) for this — keep it scoped to the one command, exactly as above.

Note from this session's `pod install` output: CocoaPods itself now prints
```
DEPRECATION NOTICE: Calling `pod install` directly is deprecated in React Native...
If you are using Expo, please run: npx expo run:ios
```
This is Expo/RN's own guidance nudging toward `expo run:ios` as the all-in-one path. We deliberately did **not** use `expo run:ios` this session (see §24 on why the Expo auto-launch path is not the verified-reliable one on this machine) — we ran `pod install` and `xcodebuild` as separate, inspectable steps instead. The deprecation notice is safe to ignore for our purposes.

---

## 9. Xcode 27 Deployment-Target / Podfile Workaround — LOCAL GENERATED BUILD WORKAROUND

**VERIFIED FAILURE MODE → VERIFIED WORKING FIX.**

**Exact failure**, from a real `xcodebuild` run this session:
```
ios/Pods/Pods.xcodeproj: error: The iOS Simulator deployment target
'IPHONEOS_DEPLOYMENT_TARGET' is set to 11.0, but the range of supported
deployment target versions is 15.0 to 27.0.x. (in target
'react-native-maps-ReactNativeMapsPrivacy' from project 'Pods')
```
...and the same error repeated for `RNSVG-RNSVGFilters` (target `12.4`), `SDWebImage-SDWebImage` (target `9.0`), and `RNCAsyncStorage-RNCAsyncStorage_resources` (target `9.0`). These are resource-bundle-only Pod targets that `react_native_post_install`'s normal target enumeration doesn't reach.

**Exact fix, appended to `ios/Podfile`'s existing `post_install` block**, right after the `react_native_post_install(...)` call and before the pre-existing `fmt`/Xcode-26-consteval fix block:

```ruby
# Local build-verification fix (not committed — ios/ is gitignored, CNG regenerates
# it on EAS/prebuild): a handful of pods (react-native-maps privacy resource bundle,
# RNSVG, SDWebImage, RNCAsyncStorage) ship a deployment target below what Xcode 27
# accepts (15.0-27.0.x), which react_native_post_install doesn't normalize for
# resource-bundle-only targets. Force every pod target to match the app's own floor.
installer.pods_project.targets.each do |target|
  target.build_configurations.each do |config|
    if Gem::Version.new(config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] || '0') < Gem::Version.new('15.0')
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
    end
  end
end
```

- Deployment floor used: **`15.1`** (matches `platform :ios, podfile_properties['ios.deploymentTarget'] || '15.1'` already at the top of the generated Podfile — chosen for consistency with the app's own floor, not an arbitrary pick).
- After adding this block, you **must re-run `pod install`** (§8) for it to take effect — it's a `post_install` hook, so it only runs during pod installation, not during `xcodebuild`.
- **Required after every fresh `expo prebuild`**, because `ios/Podfile` is itself regenerated/overwritten by CNG (§7). This is exactly why it's labeled a *local generated build workaround* and not committed anywhere — there is nothing to commit; it must be re-applied by hand (or by a script) each time `ios/` is regenerated.
- Confirmed to matter for **Debug** (the only configuration actually built this session). **Release is UNVERIFIED** for this specific fix — the same class of pods would presumably hit the same wall under `-configuration Release`, since the deployment-target floor is a target-level setting independent of configuration, but this has not been directly tested.
- **This is a LOCAL GENERATED BUILD WORKAROUND.** It lives only in a gitignored, disposable file. Do not promote it into tracked application architecture (e.g., a committed Podfile, a config plugin, or app source) as part of a documentation-only task — if a cleaner permanent fix (e.g., a proper Expo config plugin, similar to the existing `plugins/withFmtXcode26Fix.js`) is worth building, that is separate, tracked implementation work requiring its own task and Sky's review, not something to slip in here.

---

## 10. Two Verified Build Modes

### A. Debug + Metro — VERIFIED WORKING (this session's actual path)

Use for fast iterative visual work, and it's the only mode this session actually exercised end-to-end.

Rules, all confirmed by direct experience this session:
- Metro **must** be started from the exact candidate worktree's directory — a Metro process left running from a different worktree/branch will serve *that* worktree's JS, silently making your candidate build show the wrong code (§25 failure table).
- `.env` changes require a Metro **restart** (§5) — Metro does not hot-reload its own env at runtime.
- Cold-start bundling can look stuck when it isn't (§11) — do not panic-restart.
- Good for rapid iteration because you don't need to rebuild the native shell for every JS change — just let Metro re-bundle and reload/relaunch the app.

### B. Release / self-contained — UNVERIFIED THIS SESSION

Not exercised in the VP1 fix3 session — Debug+Metro was used throughout. The theoretical benefits (JS bundled into the candidate, no live Metro dependency during acceptance, eliminates wrong-worktree/stale-Metro risk entirely) are real reasons to prefer it for **independent acceptance** runs (e.g., a Codex pass validating a finished candidate, per §31) — but until someone actually runs it on this machine and confirms it end-to-end, treat the exact command below as a **starting hypothesis**, not a proven recipe:

```bash
# UNVERIFIED — same shape as the verified Debug command (§12), swapping the
# configuration. Has not been run end-to-end on this machine.
xcodebuild -workspace ios/Flagstone.xcworkspace -scheme Flagstone \
  -configuration Release \
  -destination "id=F6B9246F-2B95-4C5C-BC7F-CDD4D3D1E4DC" \
  -derivedDataPath ios/build \
  -jobs 3 ONLY_ACTIVE_ARCH=YES \
  build
```

Before trusting this for real acceptance work, a future session should actually run it, confirm the product lands at `ios/build/Build/Products/Release-iphonesimulator/Flagstone.app`, confirm `.env` values got inlined correctly (Release typically bundles JS at build time — verify this actually happened rather than assuming), and update this section from UNVERIFIED to VERIFIED WORKING with the real evidence.

**Recommended default:** Release for independent/final acceptance once verified; Debug + Metro for local rapid iteration (today's only proven path).

---

## 11. Metro Cold-Start Behavior

**VERIFIED WORKING (eventually) / important timing lesson.**

Observed this session: after a fresh app launch pointed at a cold Metro instance, the on-device bundling progress UI sat at
```
Bundling 83%...
```
for long enough that it looked hung. It was not — it finished successfully shortly after, and the app loaded correctly with the new code.

How to tell **delayed-but-progressing** apart from **actually hung**:
- Check the Metro terminal/log output directly — if it's a large Expo/RN app with many dependencies, a genuinely cold bundle (empty Metro cache) can take a real minute-plus. This is normal, not a bug.
- Don't restart the app or the bundler just because the percentage hasn't moved in the last few seconds of wall-clock time you happened to check.
- **Do not spam taps/reloads while bundling** — queued input during a bundle-in-progress is exactly the kind of thing that produces the confusing "did my tap register?" symptom described in §18, compounding one problem with another.
- This document does **not** invent a specific timeout number (e.g., "wait exactly 90 seconds") because this session's evidence doesn't support pinning one precisely — only restart if the Metro log itself has stopped emitting any progress or error for a clearly unreasonable stretch (several minutes with zero log movement), not based on the on-device percentage alone.

---

## 12. `xcodebuild` Golden Commands

**VERIFIED WORKING** — this is the literal command that produced a working `Flagstone.app` this session:

```bash
xcodebuild -workspace ios/Flagstone.xcworkspace -scheme Flagstone \
  -configuration Debug \
  -destination "id=F6B9246F-2B95-4C5C-BC7F-CDD4D3D1E4DC" \
  -derivedDataPath ios/build \
  -jobs 3 ONLY_ACTIVE_ARCH=YES \
  build
```

Piece by piece:

| Flag | Required? | Why |
|---|---|---|
| `-workspace ios/Flagstone.xcworkspace` | Required | The CocoaPods-integrated workspace, not the bare `.xcodeproj` |
| `-scheme Flagstone` | Required | The app's own scheme (confirmed via `xcodebuild -workspace ... -list`) |
| `-configuration Debug` | Required (pick one) | Swap to `Release` for §10B, once verified |
| `-destination "id=<UDID>"` | Strongly recommended | Targets the exact simulator by UDID — see §14 on why UDID beats device-name matching |
| `-derivedDataPath ios/build` | Optional but recommended | Keeps build output inside the disposable, gitignored `ios/` tree instead of the global DerivedData cache, making cleanup and path-discovery (§13) deterministic |
| `-jobs 3` | Recommended on this machine | Throttles parallel compile jobs — this machine is memory-constrained (an 8GB Air per prior established project notes) and a full clean RN build without this throttle risks heavy swap thrashing |
| `ONLY_ACTIVE_ARCH=YES` | Recommended | Only builds for the simulator's actual architecture (arm64 on Apple Silicon), skipping unnecessary universal-binary work — meaningfully faster for local iteration |

A full clean build with real evidence from this session: roughly **50+ minutes wall-clock** on this hardware with the `-jobs 3` throttle (the machine also showed significant swap pressure — `vm.swapusage` reported ~85% of a 6GB swap file in use mid-build). This is normal for this hardware, not a sign of failure. **Do not increase `-jobs` "to make it faster"** without first confirming the machine can handle it — the throttle exists specifically because this machine's memory is the bottleneck, not CPU parallelism.

---

## 13. Build Product Location

**VERIFIED WORKING**, directly confirmed by listing the directory this session:

```
ios/build/Build/Products/Debug-iphonesimulator/Flagstone.app
```

(For a Release build, per §10B's naming convention: `ios/build/Build/Products/Release-iphonesimulator/Flagstone.app` — UNVERIFIED, but this is the standard Xcode product-path convention and should hold given `-derivedDataPath ios/build` was used.)

Deterministic discovery command, if the exact path ever seems to have shifted (e.g., a different `-derivedDataPath`, or falling back to global DerivedData):

```bash
find ios/build/Build/Products -maxdepth 2 -iname "Flagstone.app"
# or, if DerivedData path is unknown/global:
find ~/Library/Developer/Xcode/DerivedData -maxdepth 3 -iname "Flagstone.app" 2>/dev/null
```

Don't rely on memory for this path across sessions — always re-derive or re-confirm it with `find`, since a different `-derivedDataPath` choice or a global-DerivedData build changes it.

---

## 14. `simctl` Golden Commands

All **VERIFIED WORKING** this session, using the exact primary UDID:

```bash
UDID=F6B9246F-2B95-4C5C-BC7F-CDD4D3D1E4DC

# BOOT (safe to call even if already booted — see §3)
xcrun simctl boot $UDID

# STATUS
xcrun simctl list devices | grep $UDID

# INSTALL (always pass the fresh build's exact path — §4)
xcrun simctl install $UDID ios/build/Build/Products/Debug-iphonesimulator/Flagstone.app

# LAUNCH
xcrun simctl launch $UDID com.accessmap.app

# TERMINATE (OK if it errors "nothing to terminate" — harmless)
xcrun simctl terminate $UDID com.accessmap.app

# RELAUNCH = TERMINATE + LAUNCH in sequence (no single combined verb)
xcrun simctl terminate $UDID com.accessmap.app; xcrun simctl launch $UDID com.accessmap.app

# SCREENSHOT (see §15)
xcrun simctl io $UDID screenshot /path/to/output.png

# APP LIST / VERIFY INSTALL
xcrun simctl listapps $UDID | grep -A8 com.accessmap.app
```

**Prefer the exact UDID over device-name matching everywhere.** Device names ("iPhone 17 Pro") are not unique across a machine that may have several similarly-named simulators from different iOS versions or purposes; the UDID is unambiguous. This document pins the one Flagstone-dedicated UDID above specifically so no session has to guess or fuzzy-match a name.

One thing this session did **not** end up needing, and which caused real trouble when tried: `xcrun simctl openurl <UDID> "<scheme>://..."` to deep-link into the Expo dev-client's Metro-connect flow. It works mechanically, but see §25's failure-signature table — repeated `openurl` calls appear to have left a native "Open in App?" confirmation dialog in an unresponsive state that neither the specialized tool nor general desktop clicks could dismiss, requiring a full `simctl shutdown` + `simctl boot` cycle to clear. **Prefer tapping the in-app "Development servers" list entry directly over `simctl openurl` for connecting an Expo dev-client build to Metro.**

---

## 15. Screenshot Evidence

**VERIFIED WORKING** canonical command:

```bash
xcrun simctl io <UDID> screenshot <PATH>
```

`<PATH>` must end in `.png` (or another format simctl recognizes from the extension — `.png` was used exclusively and confirmed working throughout this session). This command was reliable **even while the specialized simulator-control tool and general desktop control were both struggling** (§16–18) — it talks directly to CoreSimulator, bypassing every GUI-automation layer. **This is your most trustworthy evidence-capture tool on this machine**, independent of whatever interaction chaos is happening above it.

Recommended evidence layout for a full audit run (UNVERIFIED as a fixed convention — no prior session enforced this exact structure, but it's a sensible pattern given the manifest fields already used informally):

```
~/Downloads/Flagstone-<AUDIT-NAME>-<DATE>/
  screenshots/
    001-home-light.png
    002-home-dark.png
    003-explore-light.png
    ...
  manifest.md
```

Each `manifest.md` entry should record:
- filename
- screen/state
- theme (light/dark)
- role (admin/normal/guest)
- interaction used to reach it
- PASS / ISSUE
- one short note

For a **targeted** intermediate-fix verification (not a full audit), a handful of screenshots proving the specific changed geometry is enough — see §33. Do not over-produce evidence for small fixes.

---

## 16. Specialized Simulator-Control Failure — VERIFIED FAILURE MODE

The Claude Code iOS Simulator Control tool's live panel crashed mid-session. Exact error text observed, escalating over repeated calls:

```
screenshot failed: Claude Code iOS Simulator is restarting after a crash. Try again in 1s.
The simulator restarts itself; retry this call.
```
...then, after further attempts:
```
tap failed: Claude Code iOS Simulator has stopped retrying after repeated crashes.
Retrying will not help; ask the user to re-open the simulator panel.
```

**The simulator/runtime itself remained healthy throughout** — plain `xcrun simctl io ... screenshot` calls kept working perfectly the entire time this tool was down, proving layers 1–2 (§2) were never actually affected.

**Rule going forward:**

```
LEVEL 1: specialized simulator/UI automation, when healthy
  ↓ if it produces the crash signature above
ONE confirmation retry, maximum
  ↓ if it fails again
STOP using it. Move to Level 2 (§17).
```

Do **not** spend repeated cycles trying to resurrect a tool that has explicitly told you retrying won't help. That is a direct instruction from the tool itself, not a guess.

---

## 17. General Desktop Control Fallback — VERIFIED WORKING (with caveats)

Once the specialized tool (§16) was confirmed dead, general desktop/computer-control automation was used to drive the *same* visible simulator window successfully — proving layer 2 (the GUI, §2) was fine the whole time.

How it was made to work, step by step (**VERIFIED WORKING**):
1. Request access to the "Simulator" application specifically (resolves to the classic `Simulator.app` from `/Applications/Xcode.app`, per §2 — not the beta's `DeviceHub.app`).
2. Explicitly (re-)open/focus it: `open_application("Simulator")`, or equivalently `open -a Simulator` from the shell.
3. Take a full-desktop screenshot to establish the current coordinate reference.
4. Click/drag/type using real screen coordinates read directly off that screenshot — **not** any scaled or point-space coordinate system (that scaling requirement is specific to the now-dead specialized tool's own point-space convention; general desktop control uses raw screenshot pixel coordinates 1:1).
5. Continue to use `xcrun simctl io ... screenshot` (§15) for evidence capture, since it's independent of whichever interaction layer you're driving with.

Limitations, all directly observed:
- Expect real, sometimes severe latency between issuing a click and seeing its effect (§18) — this is the single biggest gotcha of this fallback path.
- Multi-step native flows (e.g., navigating iOS's own Settings app several screens deep) are especially prone to a click landing on a since-changed screen, because of that latency. Prefer `simctl`-native equivalents (§21, §22) over deep native-Settings navigation whenever one exists.
- Standard system alerts (e.g., "Open in 'Flagstone'?") were, at least once, observed to become **completely unresponsive to both mouse clicks and keyboard input** through this path, surviving even app termination/relaunch — resolved only by a full simulator `shutdown`+`boot` cycle (§25). Don't assume every dialog will always be trivially dismissible this way.

---

## 18. Input Lag / Queued Interactions — VERIFIED FAILURE MODE (observed, not universal)

Directly observed this session: some taps/drags via the general-desktop-control fallback took **roughly 30–60+ seconds** to visibly take effect — long enough that repeated identical clicks were issued in the meantime, under the (wrong) assumption the first one had failed. Document this as **observed behavior on this machine in this session**, not a guaranteed universal constant — it may vary with system load, and this document does not have enough samples to promise a specific number every time.

Anti-waste rules:
- **Do not repeatedly click while a prior action may still be queued.** Wait, then re-screenshot to check state before clicking again.
- Confirm state changes via a fresh screenshot (either the desktop-control screenshot or, more reliably, `simctl io ... screenshot`) rather than assuming a click's outcome.
- Do not mistake a delayed-but-eventually-successful interaction for a genuinely broken UI element — several "it's not responding" moments this session turned out to just be slow, and the click had in fact landed once enough time passed.
- If control becomes sufficiently unpredictable that you can no longer tell delayed-success from genuine failure within a reasonable number of attempts, **switch to Human Drive Mode (§19)** rather than continuing to burn time on automation.

---

## 19. Human Drive Mode — a first-class approved fallback

**This is not a failure state.** If automated interaction (specialized tool or general desktop control) is unreliable, Sky can drive the simulator directly — tapping, swiping, navigating, and typing credentials straight into the simulated iPhone herself.

Protocol:
1. Agent decides the next state needed for the checklist (e.g., "open the expanded Legend").
2. Agent gives Sky **one short, concrete instruction** — e.g., *"Tap the Legend pill at the bottom-left of the map, then tell me DONE."*
3. Agent waits for Sky's "DONE" (or equivalent).
4. Agent captures evidence via `xcrun simctl io ... screenshot` (§15) — this works regardless of who or what performed the interaction.
5. Agent inspects the result, updates the manifest, and moves to the next checklist item.

Human Drive Mode is explicitly sanctioned by the acceptance workflow this document is part of. Reach for it as soon as §16–18's fallback ladder is exhausted — don't treat needing it as something to apologize for or avoid reporting.

---

## 20. Authentication Safety

**Credentials never enter chat, ever.** If a login flow needs to be tested, Sky types the credentials directly into the simulated device herself (Human Drive Mode, §19, is the natural fit here).

Agents must **not**:
- ask Sky to paste credentials into the conversation,
- inspect Keychain, any password manager, or browser/shell history for credentials,
- expose auth tokens or session identifiers in output,
- create unauthorized fake production accounts merely to exercise a QA flow.

Role-matrix testing strategy (see also §32):

| Role | Coverage |
|---|---|
| **Admin** | Full authenticated coverage — the account this session already had a live, cached session for (`skylerhalisky@gmail.com`), confirmed via the drawer showing an "Admin" entry. |
| **Normal authenticated user** | Focused shared-surface / privilege-leak spot check only — not a full re-run of every screen. |
| **Guest / signed out** | Login/auth/legal-footer/guest-navigation spot check — confirmed this session that the drawer correctly shows "Sign in" (not "Admin"/"Sign out") and that no authenticated-only controls leak into the guest nav. |

---

## 21. Dynamic Type via `simctl` — VERIFIED (help text), NOT YET EXERCISED end-to-end

The VP1 fix3 session wasted real time trying to navigate the simulated iOS Settings app manually to change text size, hit severe input lag (§18) doing it, and gave up without a live Dynamic Type screenshot. **That was the wrong approach — `simctl` has a direct command for this.** Confirmed by running `xcrun simctl ui <UDID> help` on this exact installed Xcode 27 toolchain:

```
content_size
    When invoked without arguments prints the current preferred content size category:
        Standard sizes: extra-small, small, medium, large, extra-large,
                         extra-extra-large, extra-extra-extra-large.
        Extended range sizes: accessibility-medium, accessibility-large,
                         accessibility-extra-large, accessibility-extra-extra-large,
                         accessibility-extra-extra-extra-large.
        Other values: unknown, unsupported.

content_size [increment | decrement | desired_size]
    Set the preferred content size category. 'increment'/'decrement' moves one
    step from the current value; or pass an exact category name.
```

**VERIFIED (from `--help` output on this Xcode 27 install)** exact commands to use next session:

```bash
UDID=F6B9246F-2B95-4C5C-BC7F-CDD4D3D1E4DC

# Read current setting
xcrun simctl ui $UDID content_size

# Jump straight to the largest accessibility size for a stress test
xcrun simctl ui $UDID content_size accessibility-extra-extra-extra-large

# Restore to the platform default afterward
xcrun simctl ui $UDID content_size large
```

**What is still UNVERIFIED:** nobody has actually run these two commands against the live Flagstone app and confirmed (a) the RN app picks up the change without a manual relaunch, and (b) whether a relaunch (`simctl terminate` + `simctl launch`) is required for the new content-size category to be reflected in a freshly-mounted screen tree, versus already-mounted screens updating live. **The correct next step for Dynamic Type QA is: run `content_size accessibility-extra-extra-extra-large`, relaunch the app to be safe, then screenshot the target screens (Login, expanded Legend, Watched Flags, Leaderboard, Profile or Settings) — do not go through the on-device Settings app UI.** Restore with `content_size large` when done.

---

## 22. Light / Dark Appearance via `simctl` — VERIFIED (help text + in-app toggle used)

Also confirmed via `xcrun simctl ui <UDID> help` on this exact Xcode 27 install:

```
appearance
    Prints current style: light | dark | unsupported | unknown

appearance [light | dark]
    Set the user interface appearance style.
```

**VERIFIED (from `--help` output)** exact commands:

```bash
xcrun simctl ui $UDID appearance          # read current
xcrun simctl ui $UDID appearance dark
xcrun simctl ui $UDID appearance light
```

This session actually toggled theme through **the app's own in-app Settings → Appearance control** (Light/Dark/System), not this `simctl` command, since Flagstone's own appearance setting was specifically what needed exercising. **Use `simctl ui appearance` when the goal is pure rendering coverage of the OS-level light/dark trait** (e.g., quickly checking a screen that doesn't have its own in-app override); **use the app's own Appearance control when the in-app setting itself is under test** — they are not interchangeable checks. Note Flagstone's own appearance preference is independent app state (persisted via its own settings), so `simctl ui appearance` alone would not override an explicit in-app Light/Dark choice — only affects behavior when the app is following System.

---

## 23. Reliable GUI Facts vs. Fragile Automation Assumptions

Don't repeat the unqualified claim "Simulator.app no longer exists" — it's wrong on this machine in the specific sense that matters (§2: the beta doesn't ship one, but a separate installed stable Xcode's classic Simulator.app is what's actually rendering the device, and it works fine).

The durable, portable truth: **the exact GUI packaging may change across Xcode versions and machines. `simctl`/CoreSimulator operations (§14, §15, §21, §22) are the stable foundation that doesn't depend on which GUI happens to be frontmost.** Confirm boot/install/launch/screenshot via plain `simctl` before concluding *anything* about simulator health from a GUI-layer symptom.

---

## 24. Expo Auto-Launch Warning — VERIFIED (deliberately not used) / UNVERIFIED (whether it actually fails)

This session deliberately did **not** attempt `npx expo run:ios` or Expo's automatic simulator-launch path — we went straight to explicit `expo prebuild` (§7) → `pod install` (§8) → `xcodebuild` (§12) → `simctl install/launch` (§14) instead, precisely to keep BUILD, INSTALL, and LAUNCH as separate, independently-inspectable steps. Whether `expo run:ios` would have actually failed on this Xcode 27 setup was never directly tested — treat any specific claim about it failing as **UNVERIFIED**, but the CocoaPods deprecation notice observed in §8 nudges toward exactly that path, so it's worth a future session actually testing it and updating this section either way.

The durable rule regardless of that specific answer: **if Expo's own launch mechanism ever fails or behaves unexpectedly, but `xcodebuild` (§12) and `simctl` (§14) both work and the simulator boots, iOS simulation on this machine is not broken.** Fall back to the explicit BUILD → INSTALL → LAUNCH sequence rather than concluding the whole toolchain is down.

---

## 25. Known Failure Signature Table

| Symptom | Actual meaning | Correct response | Do NOT |
|---|---|---|---|
| `Uncaught Error: Supabase env vars are missing` | Fresh worktree lacks its own gitignored `.env` (§5) | File-to-file copy from an authorized local `.env`, then restart Metro / rebuild | Paste/display values in chat; commit `.env` |
| `xcodebuild` error: `IPHONEOS_DEPLOYMENT_TARGET ... is set to <old>, but the range... is 15.0 to 27.0.x` | A Pod's resource-bundle target predates Xcode 27's floor (§9) | Apply/re-apply the local `Podfile` `post_install` normalization, re-run `pod install` | Downgrade Xcode; hand-edit each Pod's `.xcodeproj` |
| CocoaPods crashes with an encoding/locale error | UTF-8 locale not set for the `pod install` invocation (§8) | `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install` | Change the global shell locale |
| Specialized simulator-control tool: `"...is restarting after a crash"` then `"...has stopped retrying"` | Layer-3 automation integration died; layers 1–2 unaffected (§16) | One confirmation retry max, then fall back to general desktop control (§17) | Retry it in a loop for 20+ minutes |
| On-device "Bundling NN%..." appears frozen at a high percentage | Likely cold Metro cache, still genuinely working (§11) | Watch the Metro terminal log for continued activity; wait | Spam reload/relaunch/restart Metro immediately |
| Desktop-control clicks/drags appear to do nothing | Likely 30–60+s input lag, not a dead UI (§18) | Wait, re-screenshot, confirm state before clicking again | Click repeatedly in quick succession |
| A native "Open in '<App>'?" dialog stops responding to clicks *and* keyboard, survives app terminate/relaunch | SpringBoard-level alert stuck independent of the target app's process | Full `simctl shutdown` + `simctl boot` cycle on that UDID, then relaunch the app | Keep clicking; assume the app itself crashed |
| Expo's own launch/packager-connect flow behaves unexpectedly | Launcher-tooling quirk, not proof CoreSimulator is broken (§24) | Fall back to explicit `xcodebuild` + `simctl install/launch` | Reinstall/downgrade Xcode reflexively |
| Simulator reports "(Booted)" when you expected "(Shutdown)" | Normal — someone/something already booted it | Continue; do not reboot | Treat it as a blocker or reboot "just in case" |
| The visually rendered app looks like it predates your latest code change | Stale installed build — you skipped the provenance rule (§4) | Rebuild → fresh install → relaunch from your exact current SHA | Trust an already-installed app as evidence |
| Fresh native build, but the JS still looks stale/wrong | Debug+Metro pointed at a Metro process from a *different* worktree/branch (§10A) | Confirm which worktree your running Metro process's cwd actually is; kill it; restart Metro from the correct worktree | Assume the native rebuild itself failed |

---

## 26. Circuit Breakers (mandatory, high-visibility anti-waste rules)

1. **One confirmation attempt maximum** on a known specialized-automation crash signature (§16). Then stop and fall back.
2. **Never** try to resurrect an assumed-but-unverified simulator-launch mechanism (e.g., a specific Expo auto-launch behavior) once direct `xcodebuild` + `simctl` are already confirmed working in the current session.
3. **Never** reinstall or downgrade Xcode solely because a UI-automation layer failed. That is a layer-3/4 problem (§2), not a layer-1/2 one.
4. **Never** rebuild repeatedly without first understanding *why* the previous candidate can't simply be reused (check its provenance per §4 before assuming a rebuild is necessary).
5. **Never** run broad, unrelated repository archaeology merely to get the simulator booted/installed/launched — this document is supposed to make that unnecessary.
6. **Never** run the full Jest suite merely to diagnose a simulator startup problem — they are unrelated concerns.
7. **Never** expose `.env` values, under any framing ("just to double check," "just this once").
8. **Never** let a session spend 20+ minutes rediscovering a failure signature already documented in §25 — search this table first.
9. **Prefer exact UDID** over device-name matching, everywhere, always.
10. **Prefer** a verified Release build for independent/final acceptance once §10B is actually confirmed; Debug+Metro remains the correct default for local iteration today.
11. **Debug+Metro must be tied to the exact candidate worktree** — verify this explicitly (§10A) rather than assuming.
12. If `simctl boot` + `install` + `launch` + `screenshot` all work, **simulator infrastructure is fundamentally available**, even if fancier tap/gesture automation is broken. Don't conflate the two.
13. **Human Drive Mode (§19) is an expected, approved fallback — not a failure to report apologetically.**

---

## 27. What Counts as a Real Blocker

A simulator audit is genuinely **BLOCKED** only if the documented golden path (§3–§14) cannot overcome one of these:

- the exact candidate cannot build at all (not just slowly — genuinely fails, with the failure not matching any signature in §25),
- the required simulator runtime/device cannot boot,
- the exact candidate cannot install,
- the candidate cannot launch or stay open long enough to test anything,
- the app crashes before any testing can proceed,
- `simctl io ... screenshot` cannot capture the device at all,
- required authentication genuinely cannot be completed by any means including Human Drive Mode,
- a safe, required public runtime configuration (e.g., `.env`, per §5) cannot be obtained through any authorized local source,
- the simulator cannot display any usable content whatsoever.

**None of the following are blockers on their own** — they are all documented, worked-around conditions:
- the specialized automation tool is unavailable (§16 → fall back to §17),
- general automation is slow (§18 → wait it out or fall back to §19),
- a SimulatorKit/private-framework attach error occurs (§16-class failure — layer 3/4, not 1/2),
- an old assumed Expo-launcher behavior doesn't pan out (§24),
- the agent itself cannot type credentials (§20 → Human Drive Mode is the answer, not a blocker),
- the old assumed `Simulator.app` path inside the beta Xcode doesn't exist (§2 — it's `DeviceHub.app` there; the actually-used GUI comes from the separate stable Xcode install),
- a human needs to physically interact with the simulator (§19).

---

## 28. Cleanup / Persistence

Default principles — none of these were violated this session, and no cleanup beyond normal git hygiene was needed:

- **Do not** delete useful evidence (screenshots, manifests, logs) automatically at the end of a session.
- **Do not** delete a worktree's `.env` merely for tidiness if it's the authorized local dev configuration copied in per §5 — it's gitignored and harmless to leave in place for the next session in that same worktree.
- **Do not** accidentally commit generated/native artifacts (`ios/`, `node_modules/`) — both are gitignored; always sanity-check `git status --short` before any commit regardless.
- A **stale installed Flagstone candidate must never be trusted as evidence** for a *different* session's work (§4) — but there's no need to proactively uninstall it either; the next session's provenance discipline (fresh build → fresh install) supersedes whatever was there before.
- **Terminate a stale Metro process** before a different worktree needs to use the same simulator/port (§10A, §25) — `pkill -f "expo start --port 8081"` before starting a new one is safe and was used this session.
- Leave simulator boot state as-is between sessions; booting/shutting down "for hygiene" wastes time and is explicitly not required (§3, §26 rule 12).

---

## 29. Claude Quick Start

A fresh Claude Code session, with no memory of any prior chat, should be able to follow this and nothing else:

1. **Read this contract in full** before running anything simulator-related.
2. **Verify your exact candidate SHA** (§4) — `git fetch origin`, `git rev-parse HEAD`, `git status --short` must be clean.
3. **Check `.env`** exists in this worktree (§5) — if not, copy file-to-file from the main repo checkout; never display contents.
4. **Check Xcode** (§1, §3) — `xcode-select -p`, `xcodebuild -version`; confirm they match this document's pinned values (or note the drift and proceed carefully).
5. **Check the device** (§3, §14) — `xcrun simctl list devices | grep <UDID>`; boot if shut down, leave alone if already booted.
6. **Check `node_modules/`** (§6) — install with `--legacy-peer-deps` only if missing/broken.
7. **Prebuild** if `ios/` doesn't exist yet (§7) — `npx expo prebuild --platform ios --no-install`.
8. **Apply the Podfile deployment-target fix** (§9) if you hit the error signature, then `pod install` with the UTF-8 env vars (§8).
9. **Build** (§12) — the exact `xcodebuild` command, Debug unless you have a specific reason for Release.
10. **Install** the fresh product by explicit path (§4, §14).
11. **Launch** (§14) — terminate first if anything was already running.
12. **Authenticate if required** (§20) — never type/paste credentials yourself; hand off to Human Drive Mode if a human needs to sign in.
13. **Interact**: try the specialized tool first (§16); on its known crash signature, one retry max, then general desktop control (§17), respecting input-lag discipline (§18); fall back to Human Drive Mode (§19) if needed.
14. **Screenshot evidence** via `xcrun simctl io ... screenshot` (§15) — this works regardless of which interaction layer is currently in use.
15. **For Dynamic Type / appearance checks**, use `simctl ui content_size` / `simctl ui appearance` directly (§21, §22) — do not navigate the on-device Settings app manually.
16. **Report** using the structure this document's own author used (SOURCE / VISUAL ACCEPTANCE / TESTS / REAL IOS VERIFICATION / etc., per the implementation session's precedent) — be explicit about anything not live-verified.
17. **Never commit `ios/`, `node_modules/`, or `.env`** — sanity-check `git status --short` before any commit.

Fallback points are baked into steps 13 and throughout §16–19 — you should never be stuck for more than one confirmation attempt at any single layer before the next fallback is obvious.

---

## 30. Codex + XcodeBuildMCP — Future Setup (documentation only; nothing installed by this task)

**This documentation task deliberately installs and configures nothing.** No `~/.codex/config.toml` edits, no global MCP package installs happened or should happen as part of writing this file. Everything in this section is a plan for a **future, separate** Codex setup session to execute and then update this document with real findings.

A dedicated future Codex setup session should verify, and mark each one **PROVEN**, **UNPROVEN**, or **FALLBACK REQUIRED**:

1. Current XcodeBuildMCP version available to Codex on this machine — **UNPROVEN**
2. Compatibility with Xcode 27 specifically (vs. the older Xcode this machine also has at `/Applications/Xcode.app`, 26.6) — **UNPROVEN**
3. Simulator discovery (can it enumerate/find the exact `F6B9246F-...` UDID) — **UNPROVEN**
4. Boot — **UNPROVEN**
5. Build (equivalent of §12's `xcodebuild` invocation) — **UNPROVEN**
6. Install — **UNPROVEN**
7. Launch — **UNPROVEN**
8. Screenshot — **UNPROVEN**
9. UI snapshot / semantic accessibility tree — **UNPROVEN**
10. Tap — **UNPROVEN**
11. Swipe — **UNPROVEN**
12. Keyboard input — **UNPROVEN**
13. App logs — **UNPROVEN**
14. Exact-UDID targeting (vs. name-fuzzy-matching — see §14's UDID preference rule) — **UNPROVEN**
15. Behavior when its own UI automation fails (does it degrade gracefully, or hang the way this session's specialized tool did in §16?) — **UNPROVEN**

**Do not assume the older SimulatorKit/AXe-class failure this document describes for the *Claude-side* tool (§16) still applies to whatever current XcodeBuildMCP release Codex would use** — that was a different tool, on a different failure surface, observed at a different point in time. Test fresh; don't inherit the assumption.

The **portable invariant that survives regardless of what Codex's automation layer can or can't do**:

```
xcodebuild + simctl + simulator GUI + simctl screenshot + Human Drive Mode
```

Everything above that — semantic taps, UI trees, gesture automation — is a convenience layer. If it fails, the same four-layer model (§2) and fallback ladder (§16–19) apply to Codex exactly as they do to Claude.

---

## 31. Codex Quick Start (acceptance-only checklist)

Codex's role is **independent acceptance**, not implementation. It must never edit the implementation it's reviewing.

1. Read this contract in full.
2. `git fetch origin` — get the latest refs.
3. **Verify the exact Claude-produced SHA** it's meant to accept (e.g., `2690d440fbd8e62059c9f93601638778a09853d3` on `claude/ui-polish-fix3-20260829` as of this document's writing — always re-confirm the specific SHA/branch you were actually asked to accept, don't assume it's still this one).
4. **Remain strictly read-only** with respect to that implementation branch — no commits, no edits, no merges.
5. Confirm worktree cleanliness (`git status --short` empty) before building.
6. **Provision `.env` safely if needed** (§5) — copy file-to-file from an authorized local source; never read or echo its values.
7. Build its **own** candidate from that exact SHA (§7–§12) — never trust a pre-existing install (§4).
8. Boot the exact target UDID (§3, §14).
9. Install the fresh candidate (§4, §14).
10. Launch it (§14).
11. Use its own UI automation if healthy (§30) —
12. — falling back to general desktop control or Human Drive Mode (§17–§19) if not.
13. Capture its **own** screenshots (§15) — don't reuse Claude's evidence as a substitute for independent verification.
14. Inspect logs where useful (Metro, `xcodebuild`, app logs) to cross-check claims made in the implementation session's own report.
15. Compare what it observes against the implementation's stated acceptance contract (e.g., the VISUAL ACCEPTANCE table from the VP1 fix3 report).
16. Return a clear **PASS/FAIL**, citing specific evidence for any FAIL.

Codex must not edit Claude's implementation during acceptance — if something looks wrong, that's a FAIL with evidence, to be handed back, not something to fix in place.

---

## 32. Role Matrix (efficient default strategy)

| Role | Depth | Rationale |
|---|---|---|
| **Admin** | Full primary pass | Exposes the maximum reachable product surface (admin-only screens plus everything a normal/guest user also sees) |
| **Normal authenticated user** | Focused spot check | Confirm shared surfaces render identically and no admin-only control leaks in |
| **Guest / signed out** | Focused spot check | Login/auth/legal-footer/guest-navigation only |

**Do not automatically triple the entire audit across all three roles.** One comprehensive admin pass plus narrow non-admin/guest verification is the default, unless the specific change under test is role-conditional (in which case scale up coverage for *that* change only, not the whole checklist).

---

## 33. Audit Evidence Strategy

- **Intermediate implementation passes** (a single fix, a small cluster of related fixes): targeted real-iOS proof only. Capture just enough screenshots to prove the specific changed geometry/behavior. Do not regenerate a full evidence library after every small fix — this was explicitly the right call in the VP1 fix3 session and should remain the default.
- **Final combined candidate** (everything about to ship / be formally accepted): a full evidence run — every safely reachable relevant screen, key states, light/dark, Dynamic Type, role spot checks, full screenshot manifest (§15).

This two-tier approach avoids re-reviewing the same intermediate UI repeatedly while still producing a complete record at the point that actually matters.

---

## 34. Reusable Audit Prompt Template

```
REPOSITORY:        AccessMap (Flagstone)
BRANCH:            <branch>
SHA:               <exact 40-char SHA to accept>
PARENT:            <base SHA>
MODE:              <implementation | acceptance | audit>
SIMULATOR:         Flagstone Audit iPhone 17 Pro
UDID:              F6B9246F-2B95-4C5C-BC7F-CDD4D3D1E4DC
RUNTIME:           iOS 26.5
BUNDLE ID:         com.accessmap.app
BUILD MODE:        <Debug+Metro | Release>
EVIDENCE DIRECTORY: ~/Downloads/Flagstone-<AUDIT-NAME>-<DATE>/

Required sequence:
  READ docs/IOS_SIMULATOR_OPERATING_CONTRACT.md
  → VERIFY EXACT SHA (§4)
  → VERIFY/COPY SAFE .ENV (§5)
  → BUILD (§7–§12)
  → BOOT EXACT UDID (§3, §14)
  → INSTALL (§4, §14)
  → LAUNCH (§14)
  → AUTHENTICATE IF REQUIRED (§20, Human Drive Mode §19)
  → WALK REQUIRED STATES
  → SCREENSHOT (§15)
  → REPORT
  → VERIFY REPOSITORY CLEAN (git status --short)

Control fallback ladder:
  SPECIALIZED AUTOMATION (§16)
  → GENERAL DESKTOP CONTROL (§17, mind input lag §18)
  → HUMAN DRIVE MODE (§19)
```

---

## 35. Source / Secret Safety

This document, and any audit that follows it, must **never** contain:
- passwords,
- Supabase secret/service-role keys,
- authentication tokens,
- private credentials of any kind,
- copied `.env` file *contents*.

Ordinary, non-secret facts are fine to document freely, and this document does so throughout: bundle IDs, local app/repo paths, simulator UDIDs, exact shell commands, public runtime **variable names** (e.g., `EXPO_PUBLIC_SUPABASE_URL` — the name, never the value), and exact build flags.

---

## See also

- Root [`CLAUDE.md`](../CLAUDE.md) — project-wide conventions, including why the bundle ID / EAS slug / URL scheme still say `accessmap` after the Flagstone rename.
- [`docs/BETA_TESTING_GUIDE.md`](BETA_TESTING_GUIDE.md) — TestFlight/Play Store *distribution* to real testers; a different concern from this document's local-simulator development/acceptance workflow. No overlap was found between the two at the time of writing.
- [`docs/RELEASE_RUNBOOK.md`](RELEASE_RUNBOOK.md) / [`docs/RELEASE_PLAYBOOK.md`](RELEASE_PLAYBOOK.md) — release-process documents; neither contained an existing local-simulator-Release-build recipe at the time of writing (checked directly — see §10B).

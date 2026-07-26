# On-Device EXIF/GPS Strip Verification — AccessMap (RELEASE GATE)

**Why this exists:** the 2026-06-19 privacy merge (`4ebd824`) changed `stripExifNative` to re-encode photos straight from the `file://` URI (perf). Unit tests **mock** `expo-image-manipulator`, so they prove the wiring + fail-closed contract but **cannot** prove the real iOS/Android codec actually drops GPS from a URI-fed image. This check closes that gap. **Run it before the next TestFlight/EAS release.** (AccessMap doesn't auto-deploy, so `main` is safe meanwhile.)

**Covers both paths changed:** flag-photo upload **and** the newly-unified avatar upload.

## Prereqs
- A dev/TestFlight build containing `main @ 4ebd824` (or later) on a real iPhone **and** Android device (test both if possible — different native codecs).
- A photo that **definitely** has GPS EXIF (camera with location on, or add GPS to a test image).
- `exiftool` on your Mac: `brew install exiftool`

## Steps (per device, per path)
```bash
# 1. Confirm the SOURCE photo has GPS (on your Mac, with the original file)
exiftool -gps:all -ifd0:all yourphoto.jpg | grep -iE 'gps|model|make'   # expect GPS lat/long present
```
2. In the app on-device: **create a flag** with that photo (flag path), then separately **set it as your avatar** (avatar path — the newly-unified one).
3. Get each stored object: open the Supabase dashboard → Storage → `flag-photos` bucket → find the just-uploaded object(s) (path `<userId>/<ts>.<ext>` for flags, `<userId>/avatar/<ts>.<ext>` for avatars) → **Download**.
```bash
# 4. Confirm the STORED object has NO GPS/EXIF
exiftool -gps:all stored-flag.jpg     # expect: "No GPS tags" / empty
exiftool stored-flag.jpg | grep -iE 'gps|latitude|longitude'   # expect: NO output
# repeat for the avatar object
exiftool -gps:all stored-avatar.jpg
```

## Pass / Fail
- ✅ **PASS:** no GPS/EXIF location tags on either stored object, on both platforms → FIX3 is safe; clear to release.
- ❌ **FAIL:** any GPS/lat/long survives → **do not release.** Roll back FIX3 immediately:
```bash
# revert the privacy commit's stripExifNative change (whole privacy merge rollback target = c910171)
git -C /Users/skypie/AccessMap push origin c910171ba6:main --force-with-lease
```
  …then re-open as a bug (the URI-fed re-encode isn't stripping on that platform; revert to the buffer/base64 path for native).

## Notes
- The `verifyExifStripped` structural verifier still runs post-strip and is fail-closed, so a non-stripped image *should* already be rejected before upload — this on-device check confirms that belt-and-suspenders holds with the real codec.
- Reference: prior on-device methodology in `2026-06-09_AccessMap_ReSweep_Fixes.md §7`; Jordan's conditions in `2026-06-19_Jordan_TechDebtPrivacy_Phase0.md`.

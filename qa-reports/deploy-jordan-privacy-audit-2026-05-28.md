# Task: Jordan — Privacy + Data Audit on 12+ Branches

**Assigned:** 2026-05-28 by Morgan  
**Deadline:** Friday 2026-05-29 EOD  
**Authority:** Constitution Art. 7.6 (Privacy gate triggers)  
**Unblocks:** Privacy sign-off before merge wave

---

## Task

Retroactive privacy audit of all 12+ uncharted branches for compliance + data handling:

### Audit Checklist

**Location Data**
- [ ] Any new location tracking? (heatmap clustering, deeplinks, mapping)
- [ ] User consent clear? (Privacy policy updated?)
- [ ] Retention policy defined? (How long are coords stored?)

**PII Storage**
- [ ] Any new PII persisted? (email, name, phone, address)
- [ ] Storage method safe? (AsyncStorage encrypted? Supabase RLS enforced?)
- [ ] Sign-out cleanup wired? (AsyncStorage cleared when user signs out?)

**EXIF/Metadata Leaks**
- [ ] Photo branches stripping EXIF? (GPS, camera, timestamp leaked?)
- [ ] Thumbnail generation safe? (No metadata in thumbnails?)

**Disability Data**
- [ ] A11y branches handling preference data? (Dark mode, font size, motor settings)
- [ ] Preference storage encrypted? (Not exposed to other users?)
- [ ] Opt-in vs. opt-out? (Users choose to share accessibility prefs?)

**Consent Flows**
- [ ] New consent prompts needed? (If new data collection, prompt added?)
- [ ] Privacy policy in sync? (Docs match code?)
- [ ] GDPR/compliance ready? (Can users request data export/deletion?)

---

## Output

Create a privacy sign-off report:
```markdown
## Privacy Audit Summary

### ✅ PASS — No Compliance Issues
- feat/notify-flag-status-2026-05-27 (push tokens stored securely, sign-out cleanup wired)
- feat/shamus-flag-deeplink-detail-2026-05-27 (deeplinks don't leak location)

### ⚠️ CONDITIONAL PASS — Minor Updates Needed
- feat/shamus-category-quickfilter-2026-05-26
  - Issue: Filter prefs stored in AsyncStorage but not encrypted
  - Fix: Add encryption before ship, or note non-PII in policy
  - Timeline: Doable before launch

### 🚫 BLOCKED — Privacy Violations
- [none identified]

### Action Items for Sky/Team
1. Update privacy policy to reference new location data (heatmap)
2. Add explicit EXIF stripping test to photo upload flow
3. Document disability data retention (a11y prefs — 30d cleanup on sign-out)

## Signature
Privacy audit complete. Ready to ship. [No violations detected | Minor fixes needed before launch]
```

File: `qa-reports/privacy-audit-report-2026-05-29.md`

---

**Authority:** Const. 7.6 (Jordan mandatory privacy gate)  
**Timeline:** Can execute in parallel with other audits

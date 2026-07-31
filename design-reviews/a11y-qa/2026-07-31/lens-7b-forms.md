# LENS 7b — FORMS + FLOWS REMAINDER (banked 2026-07-31)

(The 2.2-six live in `lens-7a-the-22six.md`; target sizes there too.)

## Verified (programmatic)

- **3.3.2 Labels/Instructions**: the Input primitive wires `accessibilityLabel ?? label`; every raw TextInput call site carries its own label; no placeholder-as-only-label anywhere (255-element sweep, class G clean). Severity picker carries live inline definitions per option (PROTECT-3).
- **3.3.1/3.3.3 Error identification + suggestion**: client validation strings ARE suggestions ("Please enter a valid email address." / "Password must be at least 6 characters."); server errors humanized through one register (`errors.ts` errorMessage, copy.ts's single failure dialect). The gap is *announcement*, not identification — already filed as A11Y-203 (lens 2). Destructive flows use the house `confirm()`.
- **2.5.2 Pointer cancellation**: RN Pressable activates on up-event; assertion F bans gesture libraries repo-wide; long-press (bulk-select entry) is cancelable and has the "Select multiple" button alternative. No down-event activations found.
- **1.3.5 Identify input purpose**: SignInScreen fully wired (`autoComplete="email"/"password"`, `textContentType`).

## Findings

- **A11Y-233 (Low · 1.3.5 · programmatic): FeedbackModal's contact-email field has `keyboardType="email-address"` but no `autoComplete`/`textContentType`** (`FeedbackModal.tsx:293`) — the one user-info input without a programmatic purpose. (Session prefill mitigates for signed-in users; guests type it raw.) One-prop fix.
- Cross-refs already filed: A11Y-203 (validation announce) · A11Y-226 (3.3.7 guest draft) · A11Y-227 (3.3.8 newPassword polish) · A11Y-228 (KAV class).

**FINISHED** — 1 Low; forms are in strong shape.

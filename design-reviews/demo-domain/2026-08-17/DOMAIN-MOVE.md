# THE DEMO DOMAIN — accessmap.skypistudio.com → flagstone.skypistudio.com
**2026-08-17 · the DNS/Vercel half is yours to click; everything code-side is prepped and waiting on one constant.**

## Where things stand

| Fact | Verified today |
|---|---|
| `accessmap.skypistudio.com` | live, serves the app, DNS → `f378309096ff65de.vercel-dns-017.com` (**Vercel**, not GitHub Pages) |
| `flagstone.skypistudio.com` | **no DNS record** — does not exist yet |
| App name / PWA name | already **Flagstone** (`og:title` "Flagstone — community-powered accessibility map") |
| URL scheme | still `accessmap://` — pinned deliberately by the rename close-out |
| `flagstone.com` / `.ca` / `.app` | all taken (Name Forge). A subdomain you already own is the cheap path. |

**Why the old host must keep working, not just get replaced:** the Supabase **redirect URLs and Site URL** are tied to `accessmap.skypistudio.com`, the `accessmap://` scheme is pinned to it, and every share link sent before today points at it. Retiring it breaks auth. Add the new host, keep the old one answering.

## Your steps (Vercel + DNS — I can't do these, they need your accounts)

1. **Vercel → the AccessMap project → Settings → Domains → Add.** Enter `flagstone.skypistudio.com`.
2. **DNS (wherever skypistudio.com is managed) → add the record Vercel shows you.** For a subdomain that is normally a `CNAME` for `flagstone` pointing at the target Vercel gives (commonly `cname.vercel-dns.com`). Vercel's own panel is the authority — copy what it displays rather than what this doc guesses.
3. **Wait for Vercel to show "Valid Configuration"** and the certificate to issue (usually minutes).
4. **Do NOT remove `accessmap.skypistudio.com`.** Leave it attached to the same project so both hosts serve the app. Optionally set `flagstone` as the Production Domain so Vercel canonicalises to it.
5. **Supabase → Authentication → URL Configuration:** *add* `https://flagstone.skypistudio.com` (and its callback) to the allowed redirect URLs. **Add, never replace** — the existing `accessmap` entries stay, or sign-in breaks for anyone mid-flow. (The rename close-out's §5b said not to touch this section for the *rename*; adding a second allowed origin for a *new host* is the deliberate exception, and only ever additive.)
6. Tell me it's live, or check yourself: `curl -sI https://flagstone.skypistudio.com | head -1` should return `HTTP/2 200`.

## Then the code side — two one-line changes, both already isolated for this

1. **`~/AccessMap/src/lib/shareFlag.ts`** — `WEB_ORIGIN` is a single exported constant, currently `https://accessmap.skypistudio.com`. Point it at the new host. Its test builds every expectation from that constant, so the suite follows it. **Do not flip this before step 6 passes** — a share link to a domain that doesn't resolve is worse than one naming the old brand.
2. **`~/Portfolio/content/deliverables.json`** — the `Live map` link href on the `accessmap` deliverable. Same rule: only after the host answers.

## What is NOT part of this

- **The `accessmap://` scheme stays.** Renaming it orphans every link already shared and every Supabase redirect. It is an identifier, not a name.
- **The GitHub repo keeps its name**, so the case study's "GitHub" link keeps pointing at `Skypie99/AccessMap`.
- **Universal Links** (an https link opening the *app* instead of the web build on a phone) are a separate job: they need an `apple-app-site-association` file and an `assetlinks.json` served from the domain, plus the associated-domains entitlement. Not configured today, which is why the share footer keeps the `accessmap://` line underneath the web link. Worth doing later; it does not block anything here.

---

## CORRECTION — 2026-08-17, during execution

**The Supabase premise above was wrong.** Two places in this doc — the "Why the old host must
keep working" paragraph and step 5 — assert that the Supabase **redirect URLs and Site URL** are
tied to `accessmap.skypistudio.com`, and warn that replacing them breaks sign-in "for anyone
mid-flow." That is not what was in the project. Checked live in the dashboard before making any
change:

| Setting | Value found |
|---|---|
| Site URL | `http://localhost:3000` (unconfigured default) |
| Redirect URLs | **empty** |
| Confirm email | **off** |

Nothing in Supabase auth referenced `accessmap` at all. There were no entries to preserve, and
with Confirm email off, no confirmation emails were being sent, so there was no "mid-flow" cohort
to protect. A grep of `src/` also found no `resetPasswordForEmail`, `signInWithOtp`,
`signInWithOAuth`, or `emailRedirectTo` — the app is email/password only, so **no flow in the app
uses the redirect allowlist today**.

**The real problem was the opposite of the one described:** a production project pointing its Site
URL at `http://localhost:3000`. Latent right now, but the day password reset is added or Confirm
email is switched on, every one of those emails would have sent users to a dead localhost link.

**What was actually done** (approved by Sky, deliberately beyond this doc's original scope):

- Site URL → `https://flagstone.skypistudio.com`
- Redirect URLs → added `https://flagstone.skypistudio.com/**` *and*
  `https://accessmap.skypistudio.com/**`, so the old host is explicitly allowed rather than
  implicitly allowed by having been the Site URL

**What did not change, and why:** `accessmap.skypistudio.com` still serves, still attached to the
same Vercel project, no redirect. The Supabase justification for keeping it evaporated, but the
other two reasons in this doc stand on their own — share links already sent carry the old
`WEB_ORIGIN`, and the `accessmap://` scheme is pinned. Do not let the corrected premise talk you
into retiring the old host.

**Method note for next time:** read the live config before reasoning from a runbook. Both the doc
and, initially, the assistant reasoned forward from the written premise and produced a careful
plan for a risk that did not exist, while missing the one that did.

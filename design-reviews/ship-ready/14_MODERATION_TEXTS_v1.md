# AccessMap Moderation Texts v1.1 (D1-AMEND-02 approved, 2026-08-27)

Drafted by Claude with Sky. Every word below requires Sky's explicit ratification before it ships. Note: plain-language solo-maintainer terms, not legal advice.

## 0 · The Mission Statement (Sky's words, lightly combed; ratify the comb)

"The goal of AccessMap is to make the community and environment better for everyone, through those who have the capacity to help. Progress happens in the background for everyone's benefit, because accessibility benefits everyone."

Where it lives: the About page, the App Store description (lead with it), the repo README, and the portfolio case study. It stays in Sky's voice everywhere. Never corporatized, never padded.

## 1 · Terms & Community Guidelines (in-app page)

Flagstone Terms & Community Guidelines Effective 2026-08-27 · v1.1

**What Flagstone is.** Flagstone is a community map of accessibility barriers. I'm Sky, and I built it and run it on my own so that disabled people get better information about the places they move through. By using the app, you're agreeing to these terms.

**Community-provided information.** Barrier reports come from people like you. I do my best to keep them honest through verification and moderation, but I can't promise every report is accurate or up to date. Please don't make Flagstone your only source when your safety is on the line.

**What you can post.** Real barriers, honestly described. Photos should show the barrier, not people. Please keep faces, licence plates, and anything that identifies a person out of frame.

**What's not allowed.** Anything hateful, harassing, sexually explicit, violent, spammy, deliberately false, or that exposes someone's private information. I remove content that breaks these rules, and I may restrict accounts that post it.

**Reports and moderation.** Every flag and comment can be reported right in the app. I review reports within 24 hours and take down anything that breaks these guidelines. You can also hide comments on your own device whenever you like.

**Your content.** What you post stays yours. By posting it, you're letting Flagstone show it in the app so the community can use it.

**Your account.** You can delete your account any time from your Profile. Deleting your account permanently removes your profile information, reports and their associated content, direct contributions, feedback, and uploaded photos. This cannot be undone.

**Changes.** If these terms ever change, the new version will live right here with a new date at the top.

**Contact.** Questions or concerns? Reach me at support@skypistudio.com. Flagstone is made in Canada and operates under the laws of British Columbia.

## 2 · Content filter: policy + copy (leg 1.2(a))

Policy (for the gap-closer run to implement): at submit time, flag descriptions and comments are checked case-insensitively, on word boundaries, against a blocked-terms list covering slurs and hate terms, explicit sexual terms, and harassment language. Seed list: the established open-source LDNOOBW English list, stored at `src/moderation/blockedTerms.ts`, plus a Sky-editable additions array in the same file. Matching content is rejected client-side before insert.

Rejection copy (shown to the poster):

"This can't be submitted yet. It may contain language that breaks the community guidelines. Please edit it and try again."

(Deliberately does not echo or name the matched term.)

## 3 · Report categories (the Report sheet, leg 1.2(b))

1. Spam or fake report
2. Harassment or hate
3. Explicit or inappropriate content
4. Privacy violation (shows a person, plate, or address)
5. Something else

## 4 · The response commitment (Sky's genuine promise)

"Reports are reviewed within 24 hours."

## 5 · REPORT_SENT_BODY (ratified replacement)

"Thanks, your report was sent. Reports are reviewed within 24 hours."

## Ratification block (paste into DECISIONS.md §SKY after Sky's edits/approval)

```
§SKY: Moderation texts ratified (2026-07-27)
Mission statement RATIFIED (v1, Sky's words): "The goal of AccessMap is to
  make the community and environment better for everyone, through those who
  have the capacity to help. Progress happens in the background for
  everyone's benefit, because accessibility benefits everyone."
  Lives in: About page, App Store description, README. Voice: Sky's, always.
ToS & Community Guidelines v1.0: RATIFIED per accessmap_moderation_texts_v1.md
  (contact = support@skypistudio.com; account-deletion wording
  matches live SET NULL behavior per SR-117)
Filter (1.2a): seed = LDNOOBW English + Sky-editable additions file;
  rejection copy ratified as drafted
Report categories: the five as listed
Response commitment: 24 hours, Sky's genuine commitment
REPORT_SENT_BODY: "Thanks, your report was sent. Reports are reviewed
  within 24 hours."
```

### D1-AMEND-02 account-deletion revision (approved 2026-08-27)

Terms & Community Guidelines v1.1 is approved for the D1 Option A deletion
implementation. The account-deletion paragraph now describes permanent removal
of the account and associated content. It is rendered verbatim by `copy.ts`;
the public, externally published policy remains Sky's publication responsibility
before release.

// Quick-fill report templates for ReportFlagModal.
//
// AccessMap users are often reporting *while in the field* — kneeling next
// to a broken curb cut, or crossing a wide intersection looking for a
// missing audible signal. The default modal asks the reporter to set a
// category, pick a severity, type a description, and (optionally) attach a
// photo. That's the right floor for a first-time reporter, but it makes a
// 5-second "report this" task feel like a 30-second form.
//
// A template is a pre-filled triple (category + severity + suggested
// description) for a common scenario. Tapping a template chip seeds the
// form; the reporter can still tweak any field before submitting.
//
// Constraints:
//   - Templates ship locally (no schema, no fetch) so they work offline.
//   - Each template's category MUST be in CATEGORY_ORDER, severity in
//     SEVERITY_ORDER. Stale entries are filtered out at runtime so a future
//     category rename doesn't break the picker.
//   - Description is a SUGGESTION — the user is expected to edit it.
//     We deliberately keep them short and generic so they don't get
//     copy-pasted verbatim into every report.
//   - No tests yet — the data is static and the consumer (ReportFlagModal)
//     handles validation. A future test can assert "every template's
//     category is in CATEGORY_ORDER".

import { CATEGORY_ORDER, SEVERITY_ORDER } from './flags';
import type { FlagCategory, FlagSeverity } from '@/types/database';

export interface ReportTemplate {
  /** Stable id used as React key and for analytics-friendly logging. */
  id: string;
  /** Short chip label. Should fit on one line at large dynamic type. */
  label: string;
  category: FlagCategory;
  severity: FlagSeverity;
  /**
   * Suggested description. Intentionally short and editable so reporters
   * customize before submitting — verbatim descriptions are less useful
   * for triagers than a one-line tailored note. May be null if no useful
   * generic copy exists.
   */
  description: string | null;
}

/**
 * Curated list of common in-the-field scenarios. Ordered roughly by how
 * frequently a reporter would reach for them in an urban accessibility
 * audit — broken sidewalk and missing curb cut at the top.
 *
 * Add carefully: every template is a button on the report modal, and
 * crowding the picker hurts more than the marginal coverage of an
 * 8th option. Two-three per category is a healthy upper bound.
 */
export const REPORT_TEMPLATES: readonly ReportTemplate[] = [
  {
    id: 'broken_sidewalk_basic',
    label: 'Broken sidewalk',
    category: 'broken_sidewalk',
    severity: 3,
    description: 'Cracked or uneven pavement — wheels catch here.',
  },
  {
    id: 'no_ramp_curb',
    label: 'Missing curb cut',
    category: 'no_ramp',
    severity: 4,
    description: 'No ramp at the corner — wheelchair users have to detour.',
  },
  {
    id: 'blocked_path_construction',
    label: 'Blocked by construction',
    category: 'blocked_path',
    severity: 4,
    description: 'Construction barriers fully block the sidewalk.',
  },
  {
    id: 'blocked_path_parked',
    label: 'Parked vehicle blocks path',
    category: 'blocked_path',
    severity: 3,
    description: 'A vehicle or scooter is parked across the path.',
  },
  {
    id: 'missing_signal_audible',
    label: 'No audible signal',
    category: 'missing_signal',
    severity: 4,
    description: 'Pedestrian signal has no audible cue for blind / low-vision crossers.',
  },
  {
    id: 'steep_grade',
    label: 'Steep slope',
    category: 'steep_grade',
    severity: 3,
    description: 'Slope is too steep to roll up safely.',
  },
  {
    id: 'other_hazard',
    label: 'Other hazard',
    category: 'other',
    severity: 2,
    description: null,
  },
];

const CATEGORY_SET = new Set<FlagCategory>(CATEGORY_ORDER);
const SEVERITY_SET = new Set<FlagSeverity>(SEVERITY_ORDER);

/**
 * Filter the template list to entries whose category + severity are still
 * in the live enums. Used by the picker so a future category rename can't
 * surface a broken chip that, when tapped, would silently fail to apply.
 *
 * Keeps the order of REPORT_TEMPLATES so the picker reads top-to-bottom
 * the same way it does in the source file.
 */
export function validReportTemplates(): ReportTemplate[] {
  return REPORT_TEMPLATES.filter(
    (t) => CATEGORY_SET.has(t.category) && SEVERITY_SET.has(t.severity),
  );
}

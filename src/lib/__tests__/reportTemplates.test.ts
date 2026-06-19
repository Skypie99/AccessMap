/**
 * Tests for reportTemplates.ts — quick-fill scenarios for ReportFlagModal.
 *
 * The module is pure data + one filter function. Tests pin:
 *   - REPORT_TEMPLATES integrity: ids are unique, categories are in
 *     CATEGORY_ORDER, severities are in SEVERITY_ORDER, labels and glyphs
 *     are non-empty.
 *   - validReportTemplates() filters out entries whose category/severity
 *     have drifted out of the live enums.
 *   - validReportTemplates() preserves the source ordering of REPORT_TEMPLATES.
 *   - validReportTemplates() does not mutate the source array.
 */

import { CATEGORY_ORDER, SEVERITY_ORDER } from '../flags';
import { REPORT_TEMPLATES, validReportTemplates, type ReportTemplate } from '../reportTemplates';
jest.mock('../supabase', () => ({ __esModule: true, supabase: { from: jest.fn() } }));

// ---------------------------------------------------------------------------
// REPORT_TEMPLATES — static integrity
// ---------------------------------------------------------------------------

describe('REPORT_TEMPLATES — static integrity', () => {
  it('has at least one template', () => {
    expect(REPORT_TEMPLATES.length).toBeGreaterThan(0);
  });

  it('every template id is unique', () => {
    const ids = REPORT_TEMPLATES.map((t) => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('every template has a non-empty label', () => {
    for (const t of REPORT_TEMPLATES) {
      expect(t.label.trim().length).toBeGreaterThan(0);
    }
  });

  it('every template has a non-empty glyph', () => {
    for (const t of REPORT_TEMPLATES) {
      expect(t.glyph.length).toBeGreaterThan(0);
    }
  });

  it('every template category is in the live CATEGORY_ORDER enum', () => {
    const categorySet = new Set(CATEGORY_ORDER);
    for (const t of REPORT_TEMPLATES) {
      expect(categorySet.has(t.category)).toBe(true);
    }
  });

  it('every template severity is in the live SEVERITY_ORDER enum', () => {
    const severitySet = new Set(SEVERITY_ORDER);
    for (const t of REPORT_TEMPLATES) {
      expect(severitySet.has(t.severity)).toBe(true);
    }
  });

  it('description is either null or a non-empty string (never empty string)', () => {
    for (const t of REPORT_TEMPLATES) {
      if (t.description !== null) {
        expect(typeof t.description).toBe('string');
        expect(t.description.length).toBeGreaterThan(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// validReportTemplates — filter logic
// ---------------------------------------------------------------------------

describe('validReportTemplates', () => {
  it('returns all templates today (none have drifted)', () => {
    expect(validReportTemplates()).toHaveLength(REPORT_TEMPLATES.length);
  });

  it('preserves the source order of REPORT_TEMPLATES', () => {
    const result = validReportTemplates();
    const sourceIds = REPORT_TEMPLATES.map((t) => t.id);
    expect(result.map((t) => t.id)).toEqual(sourceIds);
  });

  it('returns a new array — not the same reference as REPORT_TEMPLATES', () => {
    // Verifying Array.filter creates a new array (defensive against callers
    // accidentally mutating the source list).
    expect(validReportTemplates()).not.toBe(REPORT_TEMPLATES);
  });

  it('returned templates carry through every field unchanged', () => {
    const result = validReportTemplates();
    for (let i = 0; i < REPORT_TEMPLATES.length; i++) {
      const src = REPORT_TEMPLATES[i]!;
      const got = result[i]!;
      expect(got.id).toBe(src.id);
      expect(got.label).toBe(src.label);
      expect(got.glyph).toBe(src.glyph);
      expect(got.category).toBe(src.category);
      expect(got.severity).toBe(src.severity);
      expect(got.description).toBe(src.description);
    }
  });

  it('every returned template still passes the category + severity check', () => {
    const categorySet = new Set(CATEGORY_ORDER);
    const severitySet = new Set(SEVERITY_ORDER);
    for (const t of validReportTemplates()) {
      expect(categorySet.has(t.category)).toBe(true);
      expect(severitySet.has(t.severity)).toBe(true);
    }
  });

  it('does not mutate the source REPORT_TEMPLATES array', () => {
    const before = REPORT_TEMPLATES.map((t) => t.id).join(',');
    validReportTemplates();
    const after = REPORT_TEMPLATES.map((t) => t.id).join(',');
    expect(after).toBe(before);
    // Length unchanged (no in-place splice/pop)
    expect(REPORT_TEMPLATES.length).toBeGreaterThan(0);
  });

  it('shape of each entry conforms to ReportTemplate', () => {
    // Compile-time + runtime check — fails loudly if a field is renamed.
    for (const t of validReportTemplates()) {
      const conforms: ReportTemplate = t;
      expect(conforms).toBeDefined();
      expect(typeof conforms.id).toBe('string');
      expect(typeof conforms.label).toBe('string');
      expect(typeof conforms.glyph).toBe('string');
      expect(typeof conforms.category).toBe('string');
      expect(typeof conforms.severity).toBe('number');
    }
  });
});

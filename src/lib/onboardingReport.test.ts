import { describe, it, expect } from "vitest";
import {
  RECOMMENDED_ACTIONS_PLACEHOLDER,
  cloneSectionsFromTemplates,
  formatRecommendedActions,
  substituteRecommendedActions,
  type ActionForReport,
} from "./onboardingReport";
import type { OnboardingReportSectionTemplate } from "@/types/onboarding";

describe("formatRecommendedActions", () => {
  it("returns a placeholder string when there are no actions", () => {
    expect(formatRecommendedActions([])).toBe("_No actions recorded._");
  });

  it("groups by status and orders done first, then in_progress, then pending, then n/a", () => {
    const actions: ActionForReport[] = [
      { status: "pending", name: "Pending action" },
      { status: "done", name: "Done action" },
      { status: "in_progress", name: "In flight" },
      { status: "na", name: "Not applicable" },
    ];
    const out = formatRecommendedActions(actions);
    const doneIdx = out.indexOf("Done action");
    const inProgIdx = out.indexOf("In flight");
    const pendIdx = out.indexOf("Pending action");
    const naIdx = out.indexOf("Not applicable");
    expect(doneIdx).toBeGreaterThan(-1);
    expect(doneIdx).toBeLessThan(inProgIdx);
    expect(inProgIdx).toBeLessThan(pendIdx);
    expect(pendIdx).toBeLessThan(naIdx);
  });

  it("includes notes inline when present", () => {
    const out = formatRecommendedActions([
      { status: "done", name: "Thing", notes: "Did it last week" },
    ]);
    expect(out).toContain("Thing — Did it last week");
  });

  it("trims whitespace-only notes", () => {
    const out = formatRecommendedActions([
      { status: "done", name: "Thing", notes: "   " },
    ]);
    expect(out).toContain("- Thing");
    expect(out).not.toContain("Thing —");
  });

  it("renders only sections that have actions", () => {
    const out = formatRecommendedActions([
      { status: "done", name: "A" },
      { status: "done", name: "B" },
    ]);
    expect(out).toContain("**Completed**");
    expect(out).not.toContain("**Pending**");
    expect(out).not.toContain("**In progress**");
    expect(out).not.toContain("**N/A**");
  });
});

describe("substituteRecommendedActions", () => {
  it("replaces all occurrences of the placeholder", () => {
    const body = `Top: ${RECOMMENDED_ACTIONS_PLACEHOLDER}\n\nBottom: ${RECOMMENDED_ACTIONS_PLACEHOLDER}`;
    const result = substituteRecommendedActions(body, "INSERTED");
    expect(result).toBe("Top: INSERTED\n\nBottom: INSERTED");
  });

  it("leaves the body unchanged when the placeholder is absent", () => {
    const body = "Just some text without the magic token.";
    expect(substituteRecommendedActions(body, "INSERTED")).toBe(body);
  });

  it("substitutes with empty string when there are no actions to render", () => {
    const recommended = formatRecommendedActions([]);
    const result = substituteRecommendedActions(`Actions: ${RECOMMENDED_ACTIONS_PLACEHOLDER}`, recommended);
    expect(result).toBe("Actions: _No actions recorded._");
  });
});

describe("cloneSectionsFromTemplates", () => {
  const baseTemplate = (overrides: Partial<OnboardingReportSectionTemplate>): OnboardingReportSectionTemplate => ({
    id: "id",
    service_type_id: "st",
    heading: "H",
    body_template: "B",
    sort_order: 0,
    is_active: true,
    created_at: "",
    updated_at: "",
    ...overrides,
  });

  it("preserves heading and substitutes the placeholder in body", () => {
    const templates = [
      baseTemplate({ id: "1", heading: "Discovery", body_template: "Summary." }),
      baseTemplate({ id: "2", heading: "Recommended Actions", body_template: RECOMMENDED_ACTIONS_PLACEHOLDER, sort_order: 10 }),
    ];
    const sections = cloneSectionsFromTemplates(templates, [
      { status: "done", name: "Server provisioned" },
    ]);
    expect(sections).toHaveLength(2);
    expect(sections[0]).toEqual({ heading: "Discovery", body: "Summary." });
    expect(sections[1].heading).toBe("Recommended Actions");
    expect(sections[1].body).toContain("Server provisioned");
    expect(sections[1].body).not.toContain(RECOMMENDED_ACTIONS_PLACEHOLDER);
  });

  it("orders by sort_order ascending", () => {
    const templates = [
      baseTemplate({ id: "1", heading: "Last", sort_order: 30 }),
      baseTemplate({ id: "2", heading: "First", sort_order: 10 }),
      baseTemplate({ id: "3", heading: "Middle", sort_order: 20 }),
    ];
    const sections = cloneSectionsFromTemplates(templates, []);
    expect(sections.map(s => s.heading)).toEqual(["First", "Middle", "Last"]);
  });

  it("filters out inactive templates", () => {
    const templates = [
      baseTemplate({ id: "1", heading: "Active", is_active: true }),
      baseTemplate({ id: "2", heading: "Inactive", is_active: false, sort_order: 10 }),
    ];
    const sections = cloneSectionsFromTemplates(templates, []);
    expect(sections.map(s => s.heading)).toEqual(["Active"]);
  });
});

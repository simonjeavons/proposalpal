import type {
  OnboardingActionInstance,
  OnboardingReportSection,
  OnboardingReportSectionTemplate,
} from "@/types/onboarding";

export const RECOMMENDED_ACTIONS_PLACEHOLDER = "{{recommended_actions}}";

export interface ActionForReport {
  status: OnboardingActionInstance["status"];
  name: string;
  notes?: string;
}

const STATUS_LABEL: Record<OnboardingActionInstance["status"], string> = {
  pending: "Pending",
  in_progress: "In progress",
  done: "Completed",
  na: "N/A",
};

const STATUS_HEADING_ORDER: OnboardingActionInstance["status"][] = ["done", "in_progress", "pending", "na"];

export function formatRecommendedActions(actions: ActionForReport[]): string {
  if (actions.length === 0) return "_No actions recorded._";

  const groups: Record<OnboardingActionInstance["status"], ActionForReport[]> = {
    pending: [], in_progress: [], done: [], na: [],
  };
  for (const a of actions) groups[a.status].push(a);

  const lines: string[] = [];
  for (const status of STATUS_HEADING_ORDER) {
    const group = groups[status];
    if (group.length === 0) continue;
    lines.push(`**${STATUS_LABEL[status]}**`);
    for (const a of group) {
      const note = a.notes && a.notes.trim().length > 0 ? ` — ${a.notes.trim()}` : "";
      lines.push(`- ${a.name}${note}`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

export function substituteRecommendedActions(body: string, recommended: string): string {
  if (!body.includes(RECOMMENDED_ACTIONS_PLACEHOLDER)) return body;
  return body.split(RECOMMENDED_ACTIONS_PLACEHOLDER).join(recommended);
}

export function cloneSectionsFromTemplates(
  templates: OnboardingReportSectionTemplate[],
  actions: ActionForReport[],
): OnboardingReportSection[] {
  const recommended = formatRecommendedActions(actions);
  return templates
    .filter(t => t.is_active)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(t => ({
      heading: t.heading,
      body: substituteRecommendedActions(t.body_template, recommended),
    }));
}

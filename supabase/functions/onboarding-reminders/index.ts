import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CC_EMAIL = "sj@shoothill.com";
const CC_NAME = "Simon Jeavons";
const FROM_EMAIL = "proposals@shoothill.com";
const FROM_NAME = "Shoothill Proposal Manager";

// 48 hour de-dupe window — don't chase the same stage more than once every 2 days.
const REMINDER_DEDUPE_MS = 48 * 60 * 60 * 1000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Working day helpers (Mon–Fri only) ─────────────────────────────────────
function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

function addWorkingDays(start: Date, days: number): Date {
  if (days < 0) throw new Error("addWorkingDays: days must be non-negative");
  const result = new Date(start.getTime());
  let remaining = days;
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    if (!isWeekend(result)) remaining -= 1;
  }
  return result;
}

function isOverdueWorkingDays(start: Date, days: number, now: Date): boolean {
  const deadline = addWorkingDays(start, days);
  return now.getTime() > deadline.getTime();
}

// ─── SendGrid ───────────────────────────────────────────────────────────────
async function sendSendgrid(recipientEmail: string, recipientName: string, subject: string, body: string) {
  const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
  if (!sendgridApiKey) {
    console.error("SENDGRID_API_KEY secret not set");
    return { ok: false, reason: "no-api-key" };
  }
  const ccList = recipientEmail.toLowerCase() !== CC_EMAIL.toLowerCase()
    ? [{ email: CC_EMAIL, name: CC_NAME }]
    : [];
  const payload = {
    personalizations: [{
      to: [{ email: recipientEmail, name: recipientName }],
      ...(ccList.length > 0 ? { cc: ccList } : {}),
    }],
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject,
    content: [{ type: "text/plain", value: body }],
  };
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: "Bearer " + sendgridApiKey, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error("SendGrid error:", res.status, await res.text());
    return { ok: false, reason: "sendgrid-failed" };
  }
  return { ok: true };
}

// ─── Reminder logic ─────────────────────────────────────────────────────────
type Stage = 1 | 2 | 3;

interface OnboardingRow {
  id: string;
  current_stage: Stage;
  status: string;
  organisation: string;
  client_name: string;
  configured_at: string | null;
  triggered_at: string;
  stage1_completed_at: string | null;
  last_reminder_at: string | null;
  last_reminder_stage: number | null;
  assigned_to_user_id: string | null;
  service_type_id: string | null;
}

interface ReportRow {
  onboarding_id: string;
  sent_at: string | null;
  signed_off_at: string | null;
}

interface SettingsRow {
  reminder_stage1_days: number;
  reminder_stage2_days: number;
  reminder_stage3_days: number;
}

function deadlineForStage(
  ob: OnboardingRow,
  report: ReportRow | undefined,
  settings: SettingsRow,
): { deadline: Date; days: number } | null {
  if (ob.current_stage === 1) {
    const startStr = ob.configured_at ?? ob.triggered_at;
    return { deadline: addWorkingDays(new Date(startStr), settings.reminder_stage1_days), days: settings.reminder_stage1_days };
  }
  if (ob.current_stage === 2) {
    if (!ob.stage1_completed_at) return null;
    if (report?.sent_at) return null;
    return { deadline: addWorkingDays(new Date(ob.stage1_completed_at), settings.reminder_stage2_days), days: settings.reminder_stage2_days };
  }
  if (ob.current_stage === 3) {
    if (!report?.sent_at) return null;
    if (report?.signed_off_at) return null;
    return { deadline: addWorkingDays(new Date(report.sent_at), settings.reminder_stage3_days), days: settings.reminder_stage3_days };
  }
  return null;
}

function stageReminderBody(
  ob: OnboardingRow,
  stage: Stage,
  thresholdDays: number,
  origin: string,
): { subject: string; body: string } {
  const orgName = ob.organisation || ob.client_name || "(Unknown)";
  const subject = `Reminder: onboarding Stage ${stage} for ${orgName} is overdue`;
  const link = origin ? `${origin}/onboarding/${ob.id}` : "(open the onboarding in the Proposal Manager)";
  let detail = "";
  if (stage === 1) detail = "Discovery meeting / action checklist isn't complete.";
  else if (stage === 2) detail = "Onboarding report hasn't been sent to the client.";
  else if (stage === 3) detail = "Client hasn't yet confirmed onboarding complete.";

  const body = [
    "Hi,",
    "",
    `Onboarding for ${orgName} has been at Stage ${stage} longer than the ${thresholdDays} working-day threshold.`,
    "",
    detail,
    "",
    link,
    "",
    "(You'll receive at most one reminder per stage every 48 hours.)",
    "",
    "- Shoothill Proposal Manager",
  ].join("\n");
  return { subject, body };
}

// ─── HTTP handler ───────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const now = new Date();
  const origin = req.headers.get("origin") || Deno.env.get("APP_BASE_URL") || "";

  // Load settings
  const { data: settings, error: settingsErr } = await supabase
    .from("onboarding_settings").select("*").eq("id", 1).single();
  if (settingsErr || !settings) {
    return new Response(JSON.stringify({ error: "Settings missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Load active onboardings
  const { data: onboardings, error: obErr } = await supabase
    .from("client_onboardings")
    .select("*")
    .eq("status", "active")
    .is("archived_at", null);
  if (obErr) {
    return new Response(JSON.stringify({ error: obErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const obRows = (onboardings ?? []) as OnboardingRow[];
  if (obRows.length === 0) {
    return new Response(JSON.stringify({ ok: true, scanned: 0, sent: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const obIds = obRows.map(o => o.id);

  // Load related reports + assignee profiles
  const [reportsRes, profilesRes] = await Promise.all([
    supabase.from("onboarding_reports").select("onboarding_id, sent_at, signed_off_at").in("onboarding_id", obIds),
    supabase.from("profiles").select("id, full_name, email").in(
      "id",
      Array.from(new Set(obRows.map(o => o.assigned_to_user_id).filter(Boolean) as string[])),
    ),
  ]);
  const reports = (reportsRes.data ?? []) as ReportRow[];
  const profiles = (profilesRes.data ?? []) as { id: string; full_name: string | null; email: string }[];
  const reportByObId = new Map(reports.map(r => [r.onboarding_id, r]));
  const profById = new Map(profiles.map(p => [p.id, p]));

  let sentCount = 0;
  const skipped: Array<{ id: string; reason: string }> = [];

  for (const ob of obRows) {
    const report = reportByObId.get(ob.id);
    const dl = deadlineForStage(ob, report, settings as SettingsRow);
    if (!dl) {
      skipped.push({ id: ob.id, reason: "stage-not-applicable" });
      continue;
    }
    if (now.getTime() <= dl.deadline.getTime()) {
      skipped.push({ id: ob.id, reason: "not-yet-overdue" });
      continue;
    }
    // Dedupe: skip if we sent a reminder for this same stage within REMINDER_DEDUPE_MS
    if (
      ob.last_reminder_at &&
      ob.last_reminder_stage === ob.current_stage &&
      now.getTime() - new Date(ob.last_reminder_at).getTime() < REMINDER_DEDUPE_MS
    ) {
      skipped.push({ id: ob.id, reason: "deduped" });
      continue;
    }

    const profile = ob.assigned_to_user_id ? profById.get(ob.assigned_to_user_id) : undefined;
    if (!profile?.email) {
      skipped.push({ id: ob.id, reason: "no-assignee-email" });
      continue;
    }

    const { subject, body } = stageReminderBody(ob, ob.current_stage, dl.days, origin);
    const r = await sendSendgrid(profile.email, profile.full_name || "Team", subject, body);
    if (!r.ok) {
      skipped.push({ id: ob.id, reason: "sendgrid-failed" });
      continue;
    }

    await supabase
      .from("client_onboardings")
      .update({ last_reminder_at: now.toISOString(), last_reminder_stage: ob.current_stage })
      .eq("id", ob.id);
    sentCount += 1;
  }

  return new Response(JSON.stringify({ ok: true, scanned: obRows.length, sent: sentCount, skipped }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

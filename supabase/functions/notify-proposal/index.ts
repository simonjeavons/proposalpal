import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CC_EMAIL = "sj@shoothill.com";
const CC_NAME = "Simon Jeavons";
const FROM_EMAIL = "proposals@shoothill.com";
const FROM_NAME = "ProposalPal";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function fmt(n: number): string {
  return `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const { type, proposalId } = await req.json();
  if (!type || !proposalId) {
    return new Response(JSON.stringify({ error: "type and proposalId required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Fetch proposal + the prepared-by user's profile in one query
  const { data: proposal, error: propErr } = await supabase
    .from("proposals")
    .select(`
      id, programme_title, client_name, organisation, sector,
      upfront_total, retainer_options, viewed_at,
      profiles:prepared_by_user_id (email, full_name)
    `)
    .eq("id", proposalId)
    .single();

  if (propErr || !proposal) {
    return new Response(JSON.stringify({ error: "Proposal not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const profile = proposal.profiles as { email: string; full_name: string } | null;
  const recipientEmail = profile?.email;
  const recipientName = profile?.full_name || "Team";

  if (!recipientEmail) {
    return new Response(JSON.stringify({ error: "No recipient email on this proposal" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const projectName = (proposal.programme_title as string) || "(Untitled)";
  const clientName = (proposal.organisation as string) || (proposal.client_name as string) || "(Unknown)";
  const typeLabel = (proposal.sector as string) || "Not specified";

  // Derive a headline value from retainer options
  const retainerOptions = (proposal.retainer_options as { monthlyPrice?: number }[]) || [];
  const monthlies = retainerOptions.map(r => r.monthlyPrice ?? 0).filter(p => p > 0);
  const minMonthly = monthlies.length > 0 ? Math.min(...monthlies) : 0;
  const valueStr = minMonthly > 0
    ? `from ${fmt(minMonthly)}/month`
    : (proposal.upfront_total as number) > 0
      ? fmt(proposal.upfront_total as number)
      : "N/A";

  let subject: string;
  let body: string;

  // ── VIEWED ──────────────────────────────────────────────────────────────────
  if (type === "viewed") {
    // Atomic: only mark viewed (and send email) once
    const { data: updated } = await supabase
      .from("proposals")
      .update({ viewed_at: new Date().toISOString() })
      .eq("id", proposalId)
      .is("viewed_at", null)
      .select("id");

    if (!updated || updated.length === 0) {
      // Already notified — skip silently
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    subject = `Proposal viewed: ${projectName} — ${clientName}`;
    body = [
      `Hi ${recipientName},`,
      "",
      `A customer has just opened your proposal.`,
      "",
      `Project:  ${projectName}`,
      `Customer: ${clientName}`,
      `Type:     ${typeLabel}`,
      `Value:    ${valueStr}`,
      "",
      "You'll receive another notification when they sign it.",
      "",
      "— ProposalPal",
    ].join("\n");

  // ── SIGNED ──────────────────────────────────────────────────────────────────
  } else if (type === "signed") {
    const { data: acceptance } = await supabase
      .from("proposal_acceptances")
      .select("signer_name, signer_title, retainer_price, upfront_total, first_year_total, signed_at")
      .eq("proposal_id", proposalId)
      .order("signed_at", { ascending: false })
      .limit(1)
      .single();

    const signerName = acceptance?.signer_name ?? "Unknown";
    const signerTitle = acceptance?.signer_title ?? "";
    const signedAt = acceptance?.signed_at
      ? new Date(acceptance.signed_at).toLocaleString("en-GB", { timeZone: "Europe/London" })
      : new Date().toLocaleString("en-GB", { timeZone: "Europe/London" });
    const retainerPrice = acceptance?.retainer_price ?? 0;
    const firstYearTotal = acceptance?.first_year_total ?? 0;
    const upfrontTotal = acceptance?.upfront_total ?? 0;

    subject = `Proposal signed: ${projectName} — ${clientName}`;
    body = [
      `Hi ${recipientName},`,
      "",
      `Great news — a proposal has been signed!`,
      "",
      `Project:      ${projectName}`,
      `Customer:     ${clientName}`,
      `Type:         ${typeLabel}`,
      `Signed by:    ${signerName}${signerTitle ? `, ${signerTitle}` : ""}`,
      `Signed at:    ${signedAt}`,
      "",
      `Financials:`,
      `  Upfront:      ${fmt(upfrontTotal)}`,
      `  Monthly:      ${fmt(retainerPrice)}/month`,
      `  Year 1 total: ${fmt(firstYearTotal)}`,
      "",
      "Log in to ProposalPal to download the signed contract.",
      "",
      "— ProposalPal",
    ].join("\n");

  } else {
    return new Response(JSON.stringify({ error: "type must be 'viewed' or 'signed'" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── SEND VIA SENDGRID ────────────────────────────────────────────────────────
  const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
  if (!sendgridApiKey) {
    console.error("SENDGRID_API_KEY secret not set");
    return new Response(JSON.stringify({ error: "Email not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Don't CC if recipient is already the CC address
  const ccList = recipientEmail.toLowerCase() !== CC_EMAIL.toLowerCase()
    ? [{ email: CC_EMAIL, name: CC_NAME }]
    : [];

  const payload = {
    personalizations: [
      {
        to: [{ email: recipientEmail, name: recipientName }],
        ...(ccList.length > 0 ? { cc: ccList } : {}),
      },
    ],
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject,
    content: [{ type: "text/plain", value: body }],
  };

  const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sendgridApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!sgRes.ok) {
    const errText = await sgRes.text();
    console.error("SendGrid error:", sgRes.status, errText);
    return new Response(JSON.stringify({ error: "Failed to send email" }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

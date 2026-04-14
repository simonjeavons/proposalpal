import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CC_EMAIL = "sj@shoothill.com";
const CC_NAME = "Simon Jeavons";
const FROM_EMAIL = "proposals@shoothill.com";
const FROM_NAME = "Shoothill Proposal Manager";

// Email throttle: max one view-notification email per document per this window.
// Views are still recorded in *_views tables regardless.
const VIEW_EMAIL_THROTTLE_MS = 30 * 60 * 1000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function fmt(n: number): string {
  return `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getOptionTotal(opt: { yearlyCosts: number[]; term: number; frequency: string }): number {
  const numYears = Math.ceil(Math.max(opt.term, 1) / 12);
  const costs: number[] = Array.from({ length: numYears }, (_, y) =>
    opt.yearlyCosts[y] ?? (opt.yearlyCosts[opt.yearlyCosts.length - 1] ?? 0)
  );
  if (opt.frequency === "annual") return costs.reduce((s, c) => s + c, 0);
  return costs.reduce((s, c, idx) => {
    const months = idx === numYears - 1 ? (opt.term % 12 || 12) : 12;
    const periods = opt.frequency === "monthly" ? months : Math.round(months * 52 / 12);
    return s + c * periods;
  }, 0);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const body = await req.json();
  const { type, proposalId, contractId, userAgent } = body;

  if (!type || (!proposalId && !contractId)) {
    return new Response(JSON.stringify({ error: "type and either proposalId or contractId required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Best-effort IP capture for view records
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("cf-connecting-ip")
    || null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // ── AD-HOC AGREEMENT VIEWED ──────────────────────────────────────────────────
  if (type === "adhoc-viewed") {
    if (!contractId) {
      return new Response(JSON.stringify({ error: "contractId required for adhoc-viewed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Always record the view
    await supabase.from("contract_views").insert({
      contract_id: contractId,
      user_agent: userAgent ?? null,
      ip: clientIp,
    });

    // Fetch contract + owner profile
    const { data: contract, error: contractErr } = await supabase
      .from("adhoc_contracts")
      .select(`
        id, programme_title, client_name, organisation, last_view_email_at,
        profiles:prepared_by_user_id (email, full_name)
      `)
      .eq("id", contractId)
      .single();

    if (contractErr || !contract) {
      return new Response(JSON.stringify({ ok: true, recorded: true, emailSkipped: "contract-not-found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Throttle
    const lastEmailAt = (contract as any).last_view_email_at as string | null;
    const nowMs = Date.now();
    if (lastEmailAt && (nowMs - new Date(lastEmailAt).getTime() < VIEW_EMAIL_THROTTLE_MS)) {
      return new Response(JSON.stringify({ ok: true, recorded: true, emailSkipped: "throttled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profile = (contract as any).profiles as { email: string; full_name: string } | null;
    const recipientEmail = profile?.email;
    const recipientName = profile?.full_name || "Team";

    if (!recipientEmail) {
      // No owner set — record-only, no email
      return new Response(JSON.stringify({ ok: true, recorded: true, emailSkipped: "no-owner" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("adhoc_contracts")
      .update({ last_view_email_at: new Date().toISOString() })
      .eq("id", contractId);

    const programmeTitle = (contract as any).programme_title as string || "(Untitled)";
    const adhocClientName = (contract as any).organisation as string || (contract as any).client_name as string || "(Unknown)";

    const subject = `Agreement viewed: ${programmeTitle} — ${adhocClientName}`;
    const emailBody = [
      `Hi ${recipientName},`,
      "",
      `A customer has just opened an ad-hoc agreement.`,
      "",
      `Programme: ${programmeTitle}`,
      `Customer:  ${adhocClientName}`,
      "",
      "You'll receive another notification when they sign it.",
      "(Further view notifications are throttled to once every 30 minutes.)",
      "",
      "— Shoothill Proposal Manager",
    ].join("\n");

    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
    if (!sendgridApiKey) {
      console.error("SENDGRID_API_KEY secret not set");
      return new Response(JSON.stringify({ ok: true, recorded: true, emailSkipped: "no-api-key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ccList = recipientEmail.toLowerCase() !== CC_EMAIL.toLowerCase()
      ? [{ email: CC_EMAIL, name: CC_NAME }]
      : [];

    const sgPayload = {
      personalizations: [{
        to: [{ email: recipientEmail, name: recipientName }],
        ...(ccList.length > 0 ? { cc: ccList } : {}),
      }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      content: [{ type: "text/plain", value: emailBody }],
    };

    const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${sendgridApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(sgPayload),
    });

    if (!sgRes.ok) {
      console.error("SendGrid error:", sgRes.status, await sgRes.text());
    }

    return new Response(JSON.stringify({ ok: true, recorded: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── AD-HOC AGREEMENT SIGNED ──────────────────────────────────────────────────
  if (type === "adhoc-signed") {
    if (!contractId) {
      return new Response(JSON.stringify({ error: "contractId required for adhoc-signed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: contract, error: contractErr } = await supabase
      .from("adhoc_contracts")
      .select("id, client_name, organisation, programme_title, contact_name, contact_email, upfront_items, ongoing_options, signer_name, signer_title, signed_at")
      .eq("id", contractId)
      .single();

    if (contractErr || !contract) {
      return new Response(JSON.stringify({ error: "Ad-hoc contract not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipientEmail = (contract as any).contact_email as string | null;
    const recipientName = (contract as any).contact_name as string || "Team";

    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: "No contact email on this contract" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const programmeTitle = (contract as any).programme_title as string || "(Untitled)";
    const clientName = (contract as any).organisation as string || (contract as any).client_name as string || "(Unknown)";
    const signerName = (contract as any).signer_name as string || "Unknown";
    const signerTitle = (contract as any).signer_title as string || "";
    const signedAt = (contract as any).signed_at
      ? new Date((contract as any).signed_at).toLocaleString("en-GB", { timeZone: "Europe/London" })
      : new Date().toLocaleString("en-GB", { timeZone: "Europe/London" });

    const upfrontItems: { name?: string; type?: string; price: number }[] = (contract as any).upfront_items || [];
    const upfrontTotal = upfrontItems.reduce((s, i) => s + (i.price || 0), 0);

    const ongoingOptions: { name?: string; yearlyCosts: number[]; term: number; frequency: string }[] = (contract as any).ongoing_options || [];
    const ongoingLines = ongoingOptions.map(opt => {
      const total = getOptionTotal(opt);
      const name = opt.name || "Ongoing";
      return `  ${name}: ${fmt(total)} (over ${opt.term} months)`;
    });

    const grandTotal = upfrontTotal + ongoingOptions.reduce((s, opt) => s + getOptionTotal(opt), 0);

    const financialsBlock = [
      `  Upfront:     ${fmt(upfrontTotal)}`,
      ...ongoingLines,
      `  Grand Total: ${fmt(grandTotal)}`,
    ].join("\n");

    const subject = `[AD-HOC AGREEMENT] Signed: ${programmeTitle} — ${clientName}`;
    const emailBody = [
      `Hi ${recipientName},`,
      "",
      `An ad-hoc service agreement has just been signed.`,
      "",
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `  AD-HOC SERVICE AGREEMENT`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      "",
      `Programme:  ${programmeTitle}`,
      `Customer:   ${clientName}`,
      `Signed by:  ${signerName}${signerTitle ? `, ${signerTitle}` : ""}`,
      `Signed at:  ${signedAt}`,
      "",
      `Financials:`,
      financialsBlock,
      "",
      `Log in to the Shoothill Proposal Manager and go to All Agreements`,
      `to view and download the signed contract.`,
      "",
      "— Shoothill Proposal Manager",
    ].join("\n");

    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
    if (!sendgridApiKey) {
      console.error("SENDGRID_API_KEY secret not set");
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ccList = recipientEmail.toLowerCase() !== CC_EMAIL.toLowerCase()
      ? [{ email: CC_EMAIL, name: CC_NAME }]
      : [];

    const sgPayload = {
      personalizations: [
        {
          to: [{ email: recipientEmail, name: recipientName }],
          ...(ccList.length > 0 ? { cc: ccList } : {}),
        },
      ],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      content: [{ type: "text/plain", value: emailBody }],
    };

    const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sendgridApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sgPayload),
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
  }

  // ── PROPOSAL NOTIFICATIONS (existing logic) ──────────────────────────────────
  if (!proposalId) {
    return new Response(JSON.stringify({ error: "proposalId required for type viewed/signed" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch proposal + the prepared-by user's profile in one query
  const { data: proposal, error: propErr } = await supabase
    .from("proposals")
    .select(`
      id, programme_title, client_name, organisation, sector,
      upfront_total, retainer_options, viewed_at, last_view_email_at,
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
    // Always record the view
    await supabase.from("proposal_views").insert({
      proposal_id: proposalId,
      user_agent: userAgent ?? null,
      ip: clientIp,
    });

    // Throttle email: only send if no email has been sent within the window
    const lastEmailAt = (proposal as any).last_view_email_at as string | null;
    const now = Date.now();
    const throttled = lastEmailAt && (now - new Date(lastEmailAt).getTime() < VIEW_EMAIL_THROTTLE_MS);

    // Keep viewed_at set (first view wins for "first seen" semantics)
    if (!(proposal as any).viewed_at) {
      await supabase
        .from("proposals")
        .update({ viewed_at: new Date().toISOString() })
        .eq("id", proposalId);
    }

    if (throttled) {
      return new Response(JSON.stringify({ ok: true, recorded: true, emailSkipped: "throttled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark email-sent time atomically (best-effort; worst case one extra email)
    await supabase
      .from("proposals")
      .update({ last_view_email_at: new Date().toISOString() })
      .eq("id", proposalId);

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
      "— Shoothill Proposal Manager",
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
      "Log in to Shoothill Proposal Manager to download the signed contract.",
      "",
      "— Shoothill Proposal Manager",
    ].join("\n");

  } else {
    return new Response(JSON.stringify({ error: "type must be 'viewed', 'signed', 'adhoc-viewed', or 'adhoc-signed'" }), {
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

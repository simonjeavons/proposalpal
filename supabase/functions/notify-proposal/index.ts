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
  return "\u00a3" + n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("cf-connecting-ip")
    || null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // AD-HOC VIEWED
  if (type === "adhoc-viewed") {
    if (!contractId) {
      return new Response(JSON.stringify({ error: "contractId required for adhoc-viewed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await supabase.from("contract_views").insert({
      contract_id: contractId,
      user_agent: userAgent ?? null,
      ip: clientIp,
    });
    const { data: contract } = await supabase
      .from("adhoc_contracts")
      .select("id, programme_title, client_name, organisation, last_view_email_at, profiles:prepared_by_user_id (email, full_name)")
      .eq("id", contractId)
      .single();
    if (!contract) {
      return new Response(JSON.stringify({ ok: true, recorded: true, emailSkipped: "contract-not-found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const lastEmailAt = (contract as any).last_view_email_at as string | null;
    if (lastEmailAt && (Date.now() - new Date(lastEmailAt).getTime() < VIEW_EMAIL_THROTTLE_MS)) {
      return new Response(JSON.stringify({ ok: true, recorded: true, emailSkipped: "throttled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const profile = (contract as any).profiles as { email: string; full_name: string } | null;
    if (!profile?.email) {
      return new Response(JSON.stringify({ ok: true, recorded: true, emailSkipped: "no-owner" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await supabase.from("adhoc_contracts").update({ last_view_email_at: new Date().toISOString() }).eq("id", contractId);
    const programmeTitle = (contract as any).programme_title || "(Untitled)";
    const adhocClientName = (contract as any).organisation || (contract as any).client_name || "(Unknown)";
    const subject = "Agreement viewed: " + programmeTitle + " - " + adhocClientName;
    const emailBody = [
      "Hi " + (profile.full_name || "Team") + ",",
      "",
      "A customer has just opened an ad-hoc agreement.",
      "",
      "Programme: " + programmeTitle,
      "Customer:  " + adhocClientName,
      "",
      "You'll receive another notification when they sign it.",
      "(Further view notifications are throttled to once every 30 minutes.)",
      "",
      "- Shoothill Proposal Manager",
    ].join("\n");
    await sendSendgrid(profile.email, profile.full_name || "Team", subject, emailBody);
    return new Response(JSON.stringify({ ok: true, recorded: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // AD-HOC SIGNED
  if (type === "adhoc-signed") {
    if (!contractId) {
      return new Response(JSON.stringify({ error: "contractId required for adhoc-signed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: contract } = await supabase
      .from("adhoc_contracts")
      .select("id, client_name, organisation, programme_title, contact_name, contact_email, upfront_items, ongoing_options, signer_name, signer_title, signed_at")
      .eq("id", contractId)
      .single();
    if (!contract) {
      return new Response(JSON.stringify({ error: "Ad-hoc contract not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const recipientEmail = (contract as any).contact_email as string | null;
    const recipientName = (contract as any).contact_name || "Team";
    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: "No contact email on this contract" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const programmeTitle = (contract as any).programme_title || "(Untitled)";
    const clientName = (contract as any).organisation || (contract as any).client_name || "(Unknown)";
    const signerName = (contract as any).signer_name || "Unknown";
    const signerTitle = (contract as any).signer_title || "";
    const signedAt = (contract as any).signed_at
      ? new Date((contract as any).signed_at).toLocaleString("en-GB", { timeZone: "Europe/London" })
      : new Date().toLocaleString("en-GB", { timeZone: "Europe/London" });
    const upfrontItems: { name?: string; type?: string; price: number }[] = (contract as any).upfront_items || [];
    const upfrontTotal = upfrontItems.reduce((s, i) => s + (i.price || 0), 0);
    const ongoingOptions: { name?: string; yearlyCosts: number[]; term: number; frequency: string }[] = (contract as any).ongoing_options || [];
    const ongoingLines = ongoingOptions.map(opt => {
      const total = getOptionTotal(opt);
      const name = opt.name || "Ongoing";
      return "  " + name + ": " + fmt(total) + " (over " + opt.term + " months)";
    });
    const grandTotal = upfrontTotal + ongoingOptions.reduce((s, opt) => s + getOptionTotal(opt), 0);
    const subject = "[AD-HOC AGREEMENT] Signed: " + programmeTitle + " - " + clientName;
    const emailBody = [
      "Hi " + recipientName + ",",
      "",
      "An ad-hoc service agreement has just been signed.",
      "",
      "Programme:  " + programmeTitle,
      "Customer:   " + clientName,
      "Signed by:  " + signerName + (signerTitle ? ", " + signerTitle : ""),
      "Signed at:  " + signedAt,
      "",
      "Financials:",
      "  Upfront:     " + fmt(upfrontTotal),
      ...ongoingLines,
      "  Grand Total: " + fmt(grandTotal),
      "",
      "Log in to the Shoothill Proposal Manager and go to All Agreements",
      "to view and download the signed contract.",
      "",
      "- Shoothill Proposal Manager",
    ].join("\n");
    const r = await sendSendgrid(recipientEmail, recipientName, subject, emailBody);
    if (!r.ok) {
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // PROPOSAL VIEWED/SIGNED
  if (!proposalId) {
    return new Response(JSON.stringify({ error: "proposalId required for type viewed/signed" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: proposal, error: propErr } = await supabase
    .from("proposals")
    .select("id, programme_title, client_name, organisation, sector, upfront_total, retainer_options, viewed_at, last_view_email_at, profiles:prepared_by_user_id (email, full_name)")
    .eq("id", proposalId)
    .single();

  if (propErr || !proposal) {
    return new Response(JSON.stringify({ error: "Proposal not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const profile = (proposal as any).profiles as { email: string; full_name: string } | null;
  const recipientEmail = profile?.email;
  const recipientName = profile?.full_name || "Team";

  const projectName = (proposal as any).programme_title || "(Untitled)";
  const clientName = (proposal as any).organisation || (proposal as any).client_name || "(Unknown)";
  const typeLabel = (proposal as any).sector || "Not specified";
  // Sum retainer options using the same formula the admin list uses:
  // (discounted_price ?? price) * (quantity ?? 1)
  const retainerOptions = ((proposal as any).retainer_options as Array<{
    price?: number; discounted_price?: number; quantity?: number;
  }>) || [];
  const monthlyFee = retainerOptions.reduce(
    (s, r) => s + ((r.discounted_price ?? r.price ?? 0) * (r.quantity ?? 1)),
    0
  );
  const upfrontTotalVal = ((proposal as any).upfront_total as number) || 0;

  if (type === "viewed") {
    await supabase.from("proposal_views").insert({
      proposal_id: proposalId,
      user_agent: userAgent ?? null,
      ip: clientIp,
    });
    const lastEmailAt = (proposal as any).last_view_email_at as string | null;
    const throttled = lastEmailAt && (Date.now() - new Date(lastEmailAt).getTime() < VIEW_EMAIL_THROTTLE_MS);
    if (!(proposal as any).viewed_at) {
      await supabase.from("proposals").update({ viewed_at: new Date().toISOString() }).eq("id", proposalId);
    }
    if (throttled) {
      return new Response(JSON.stringify({ ok: true, recorded: true, emailSkipped: "throttled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!recipientEmail) {
      return new Response(JSON.stringify({ ok: true, recorded: true, emailSkipped: "no-owner" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await supabase.from("proposals").update({ last_view_email_at: new Date().toISOString() }).eq("id", proposalId);
    const subject = "Proposal viewed: " + projectName + " - " + clientName;
    const emailBody = [
      "Hi " + recipientName + ",",
      "",
      "A customer has just opened your proposal.",
      "",
      "Project:     " + projectName,
      "Customer:    " + clientName,
      "Type:        " + typeLabel,
      "Upfront:     " + fmt(upfrontTotalVal),
      "Monthly fee: " + fmt(monthlyFee) + "/month",
      "",
      "You'll receive another notification when they sign it.",
      "",
      "- Shoothill Proposal Manager",
    ].join("\n");
    await sendSendgrid(recipientEmail, recipientName, subject, emailBody);
    return new Response(JSON.stringify({ ok: true, recorded: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (type === "signed") {
    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: "No recipient email on this proposal" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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
    const subject = "Proposal signed: " + projectName + " - " + clientName;
    const emailBody = [
      "Hi " + recipientName + ",",
      "",
      "Great news - a proposal has been signed!",
      "",
      "Project:      " + projectName,
      "Customer:     " + clientName,
      "Type:         " + typeLabel,
      "Signed by:    " + signerName + (signerTitle ? ", " + signerTitle : ""),
      "Signed at:    " + signedAt,
      "",
      "Financials:",
      "  Upfront:      " + fmt(upfrontTotal),
      "  Monthly:      " + fmt(retainerPrice) + "/month",
      "  Year 1 total: " + fmt(firstYearTotal),
      "",
      "Log in to Shoothill Proposal Manager to download the signed contract.",
      "",
      "- Shoothill Proposal Manager",
    ].join("\n");
    const r = await sendSendgrid(recipientEmail, recipientName, subject, emailBody);
    if (!r.ok) {
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "type must be 'viewed', 'signed', 'adhoc-viewed', or 'adhoc-signed'" }), {
    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

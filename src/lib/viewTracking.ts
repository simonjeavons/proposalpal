import { supabase } from "@/integrations/supabase/client";

const VISIT_KEY = "sh_visit_id";

// A per-tab id. sessionStorage survives a refresh in the same tab but not a new
// tab, so reloads and in-app navigation (notably the proposal page handing off
// to the accept page) collapse into the view already recorded, while a genuine
// return visit days later counts separately.
function getVisitId(): string | null {
  try {
    const existing = sessionStorage.getItem(VISIT_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(VISIT_KEY, id);
    return id;
  } catch {
    // Some privacy modes throw on sessionStorage access. Fall back to no
    // dedupe rather than dropping the view entirely.
    return null;
  }
}

// Resolves once the page has actually been shown to someone. A prerender or a
// background prefetch that is never brought to the front never resolves, so it
// never becomes a recorded view.
function whenVisible(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (document.visibilityState !== "hidden") return Promise.resolve();
  return new Promise((resolve) => {
    const onChange = () => {
      if (document.visibilityState !== "hidden") {
        document.removeEventListener("visibilitychange", onChange);
        resolve();
      }
    };
    document.addEventListener("visibilitychange", onChange);
  });
}

// Records a customer view of a public document.
//
// Views are tracked from client-side JS, so anything that executes JS gets
// counted -- including the email security sandboxes (Microsoft Defender Safe
// Links and similar) that open every link in a headless browser to scan it.
// The server classifies each hit as human / bot / internal; this supplies the
// signals it needs to do that, and suppresses hits that were never shown to a
// person or that repeat within a single visit.
export async function trackView(
  payload: { type: string } & Record<string, unknown>,
): Promise<void> {
  try {
    // A live session means this is one of our own team, not a customer.
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return;

    await whenVisible();

    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-proposal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
      },
      body: JSON.stringify({
        ...payload,
        userAgent: navigator.userAgent,
        visitId: getVisitId(),
        isWebdriver: navigator.webdriver === true,
      }),
    });
  } catch {
    // Fire-and-forget: tracking must never affect the customer-facing page.
  }
}

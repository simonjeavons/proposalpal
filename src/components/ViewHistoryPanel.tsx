import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ViewRow {
  id: string;
  viewed_at: string;
  user_agent: string | null;
  ip: string | null;
  classification: string | null;
}

interface Props {
  documentType: "proposal" | "contract";
  documentId: string | null | undefined;
}

function summariseUserAgent(ua: string | null): string {
  if (!ua) return "Unknown device";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "Other";
}

export default function ViewHistoryPanel({ documentType, documentId }: Props) {
  const [views, setViews] = useState<ViewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!documentId) { setLoading(false); return; }
    let cancelled = false;
    const table = documentType === "proposal" ? "proposal_views" : "contract_views";
    const fkCol = documentType === "proposal" ? "proposal_id" : "contract_id";
    (async () => {
      const { data } = await supabase
        .from(table as any)
        .select("id, viewed_at, user_agent, ip, classification")
        .eq(fkCol, documentId)
        .order("viewed_at", { ascending: false })
        .limit(50);
      if (!cancelled) {
        setViews((data as unknown as ViewRow[]) || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [documentType, documentId]);

  // Bot rows are email security scanners that opened the link automatically;
  // internal rows are our own team. Neither is a customer view, so they are
  // kept out of the count and shown separately.
  const genuine = views.filter(v => (v.classification ?? "human") === "human");
  const filtered = views.length - genuine.length;

  if (!documentId) return null;

  return (
    <div style={{
      border: "1px solid #E5E7EB",
      borderRadius: 8,
      padding: 16,
      background: "#FFFFFF",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827" }}>
          View History
        </h3>
        <span style={{ fontSize: 12, color: "#6B7280" }}>
          {loading
            ? "Loading…"
            : `${genuine.length} view${genuine.length === 1 ? "" : "s"}` +
              (filtered > 0 ? ` · ${filtered} filtered` : "")}
        </span>
      </div>
      {!loading && genuine.length === 0 && (
        <div style={{ fontSize: 13, color: "#6B7280" }}>No views yet.</div>
      )}
      {genuine.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
          {genuine.map(v => (
            <div key={v.id} style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "#374151",
              padding: "6px 8px",
              background: "#F9FAFB",
              borderRadius: 4,
            }}>
              <span>{new Date(v.viewed_at).toLocaleString("en-GB", { timeZone: "Europe/London" })}</span>
              <span style={{ color: "#6B7280" }}>{summariseUserAgent(v.user_agent)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";

export interface DocumentChip {
  label: string;
  variant?: "primary" | "cyan" | "purple" | "sky" | "muted";
}

interface Props {
  statusLabel: string;
  statusClassName: string;
  clientName: string;
  organisation?: string | null;
  programmeTitle?: string | null;
  dateStr: string;
  chips?: DocumentChip[];
  viewCount?: number;
  preparedBy?: string | null;
  signedBy?: string | null;
  signedByTitle?: string | null;
  upfrontTotal?: number;
  monthlyFee?: number;
  formatCurrency?: (n: number) => string;
  actions: ReactNode;
}

const CHIP_STYLES: Record<NonNullable<DocumentChip["variant"]>, string> = {
  primary: "bg-primary/10 text-primary",
  cyan: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400",
  purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  sky: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300",
  muted: "bg-muted text-muted-foreground",
};

export default function DocumentListRow({
  statusLabel,
  statusClassName,
  clientName,
  organisation,
  programmeTitle,
  dateStr,
  chips = [],
  viewCount,
  preparedBy,
  signedBy,
  signedByTitle,
  upfrontTotal,
  monthlyFee,
  formatCurrency,
  actions,
}: Props) {
  const showFinancials = (upfrontTotal !== undefined && upfrontTotal > 0) || (monthlyFee !== undefined && monthlyFee > 0);
  return (
    <div className="px-6 py-4 flex items-center gap-4 hover:bg-muted/50 transition-colors">
      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="text-sm font-bold text-foreground truncate">{clientName || "Untitled"}</h3>
          <Badge className={`${statusClassName} text-[10px] font-bold uppercase tracking-wider`}>{statusLabel}</Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {programmeTitle || "Untitled project"}
          {organisation ? ` — ${organisation}` : ""}
          {dateStr ? ` · ${dateStr}` : ""}
        </p>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {chips.map((c, i) => (
            <span
              key={`${c.label}-${i}`}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${CHIP_STYLES[c.variant || "muted"]}`}
            >
              {c.label}
            </span>
          ))}
          {viewCount !== undefined && viewCount > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
              title={`${viewCount} view${viewCount === 1 ? "" : "s"}`}
            >
              <Eye className="w-3 h-3" />
              {viewCount}
            </span>
          )}
          {preparedBy && <span className="text-[11px] text-muted-foreground">{preparedBy}</span>}
          {signedBy && (
            <span className="text-[11px] text-muted-foreground">
              Signed by {signedBy}{signedByTitle ? `, ${signedByTitle}` : ""}
            </span>
          )}
        </div>
      </div>

      {/* Financials */}
      {showFinancials && formatCurrency && (
        <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0 min-w-[120px] text-right">
          {upfrontTotal !== undefined && upfrontTotal > 0 && (
            <div className="text-sm font-bold text-foreground">
              {formatCurrency(upfrontTotal)} <span className="text-[10px] font-normal text-muted-foreground">upfront</span>
            </div>
          )}
          {monthlyFee !== undefined && monthlyFee > 0 && (
            <div className="text-xs text-muted-foreground">
              {formatCurrency(monthlyFee)}<span className="text-[10px]">/mo</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">{actions}</div>
    </div>
  );
}

import { useState } from "react";
import { LayoutDashboard, ListChecks, FileText, Settings as SettingsIcon } from "lucide-react";
import OnboardingActiveDashboard from "@/components/OnboardingActiveDashboard";
import OnboardingActionLibraryAdmin from "@/components/OnboardingActionLibraryAdmin";
import OnboardingSectionTemplatesAdmin from "@/components/OnboardingSectionTemplatesAdmin";
import OnboardingSettingsAdmin from "@/components/OnboardingSettingsAdmin";

type SubView = "dashboard" | "actions" | "templates" | "settings";

const NAV: { key: SubView; label: string; icon: React.ElementType }[] = [
  { key: "dashboard", label: "Dashboard",         icon: LayoutDashboard },
  { key: "actions",   label: "Action library",    icon: ListChecks },
  { key: "templates", label: "Report templates",  icon: FileText },
  { key: "settings",  label: "Settings",          icon: SettingsIcon },
];

export default function OnboardingDashboardTab() {
  const [view, setView] = useState<SubView>("dashboard");
  return (
    <div>
      <div className="border-b px-6">
        <div className="flex gap-1 overflow-x-auto">
          {NAV.map(item => {
            const Icon = item.icon;
            const active = view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={[
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30",
                ].join(" ")}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {view === "dashboard" && <OnboardingActiveDashboard />}
      {view === "actions" && <OnboardingActionLibraryAdmin />}
      {view === "templates" && <OnboardingSectionTemplatesAdmin />}
      {view === "settings" && <OnboardingSettingsAdmin />}
    </div>
  );
}

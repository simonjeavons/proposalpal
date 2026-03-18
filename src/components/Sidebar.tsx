import { useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Users, UserCircle2, Target, ShoppingBag, Scale, LogOut, Plus, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Tab = "proposals" | "users" | "team" | "solutions" | "services" | "agreements";

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onServicesClick: () => void;
  userEmail?: string;
  onSignOut: () => void;
}

const MAIN_ITEMS: { tab: Tab; label: string; icon: React.ElementType }[] = [
  { tab: "proposals", label: "Proposals", icon: FileText },
  { tab: "agreements", label: "Agreements", icon: Scale },
];

const ADMIN_ITEMS: { tab: Tab; label: string; icon: React.ElementType }[] = [
  { tab: "users", label: "Users", icon: Users },
  { tab: "team", label: "Team", icon: UserCircle2 },
  { tab: "services", label: "Services", icon: Target },
  { tab: "solutions", label: "Solutions", icon: ShoppingBag },
];

function NavItem({ tab, label, icon: Icon, active, onClick, extra }: {
  tab: Tab; label: string; icon: React.ElementType; active: boolean; onClick: () => void; extra?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors rounded-md ${
        active
          ? "bg-white/10 text-white"
          : "text-white/50 hover:text-white/80 hover:bg-white/5"
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {extra}
    </button>
  );
}

export function Sidebar({ activeTab, onTabChange, onServicesClick, userEmail, onSignOut }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleTabClick = (tab: Tab) => {
    if (tab === "services") {
      onServicesClick();
    } else {
      onTabChange(tab);
    }
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <img
          src="https://shoothill.com/wp-content/uploads/2024/07/Shoothill-site-logo-3.svg"
          alt="Shoothill"
          className="h-5 brightness-0 invert mb-1.5"
        />
        <span className="text-[10px] font-semibold tracking-widest uppercase text-white/40">
          Proposal Manager
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 pt-4 space-y-1">
        {MAIN_ITEMS.map(item => (
          <NavItem
            key={item.tab}
            {...item}
            active={activeTab === item.tab}
            onClick={() => handleTabClick(item.tab)}
            extra={item.tab === "proposals" ? (
              <Link
                to="/admin/proposals/new"
                onClick={e => e.stopPropagation()}
                className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                title="New Proposal"
              >
                <Plus className="w-3.5 h-3.5" />
              </Link>
            ) : undefined}
          />
        ))}

        {/* Admin group */}
        <div className="pt-4 pb-1">
          <span className="px-4 text-[9px] font-bold tracking-widest uppercase text-white/25">
            Admin
          </span>
        </div>
        {ADMIN_ITEMS.map(item => (
          <NavItem
            key={item.tab}
            {...item}
            active={activeTab === item.tab}
            onClick={() => handleTabClick(item.tab)}
          />
        ))}
      </nav>

      {/* User / Sign out */}
      <div className="px-4 py-4 border-t border-white/10 space-y-2">
        {userEmail && (
          <div className="text-[11px] text-white/40 truncate">{userEmail}</div>
        )}
        <button
          onClick={onSignOut}
          className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-secondary text-secondary-foreground fixed inset-y-0 left-0 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden bg-secondary text-secondary-foreground px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <img
            src="https://shoothill.com/wp-content/uploads/2024/07/Shoothill-site-logo-3.svg"
            alt="Shoothill"
            className="h-4 brightness-0 invert"
          />
          <span className="text-[9px] font-semibold tracking-widest uppercase text-white/40">
            Proposal Manager
          </span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white/60 hover:text-white">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />
          <aside className="md:hidden fixed inset-y-0 left-0 w-56 bg-secondary text-secondary-foreground z-50">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}

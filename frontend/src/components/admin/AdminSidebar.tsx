import { Link } from "@tanstack/react-router";
import {
  LayoutGrid,
  BarChart3,
  Users,
  HardHat,
  UserRound,
  Briefcase,
  Activity,
  ClipboardList,
  CreditCard,
  LineChart,
  Wallet,
  Wrench,
  Star,
  Settings,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutGrid, to: "/dashboard" as const },
  { label: "Analytics", icon: BarChart3, to: "/analytics" as const },
  { label: "All Users", icon: Users, to: "/dashboard" as const },
  { label: "Workers", icon: HardHat, to: "/workers" as const },
  { label: "Clients", icon: UserRound, to: "/clients" as const },
  { label: "All Jobs", icon: Briefcase, to: "/dashboard" as const },
  { label: "Active Jobs", icon: Activity, to: "/active-jobs" as const },
  { label: "Job Requests", icon: ClipboardList, to: "/dashboard" as const },
  { label: "Payments", icon: CreditCard, to: "/dashboard" as const },
  { label: "Earnings Reports", icon: LineChart, to: "/dashboard" as const },
  { label: "Withdrawals", icon: Wallet, to: "/dashboard" as const },
  { label: "Services", icon: Wrench, to: "/services" as const },
  { label: "Reviews", icon: Star, to: "/reviews" as const },
];

interface AdminSidebarProps {
  active: string;
}

export function AdminSidebar({ active }: AdminSidebarProps) {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-background border-r border-border">
      <div className="px-6 py-6">
        <Link to="/" className="block">
          <h1 className="text-2xl font-bold text-brand tracking-tight">
            UstadGo
          </h1>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground mt-0.5">
            ADMIN PORTAL
          </p>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.label === active;
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand/10 text-brand"
                  : "text-foreground/70 hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-5 shrink-0" />
              <span>{item.label}</span>
              {isActive && (
                <span className="ml-auto h-6 w-1 rounded-full bg-brand" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-border">
        <Link
          to="/settings"
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            active === "Settings"
              ? "bg-brand/10 text-brand"
              : "text-foreground/70 hover:bg-surface-muted hover:text-foreground"
          }`}
        >
          <Settings className="size-5" />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}

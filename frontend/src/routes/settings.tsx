import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Wallet,
  Shield,
  Info,
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Admin Settings — UstadGo Admin" },
      {
        name: "description",
        content:
          "Configure UstadGo platform-wide parameters, verification, payments, and administrative access.",
      },
    ],
  }),
});

const admins = [
  { name: "Ahmed Khan", role: "SUPER ADMIN", status: "ACTIVE", statusClass: "bg-surface-muted text-foreground/70" },
  { name: "Zoya Malik", role: "MODERATOR", status: "ACTIVE", statusClass: "bg-emerald-100 text-emerald-700" },
  { name: "Usman Ali", role: "MODERATOR", status: "OFFLINE", statusClass: "bg-surface-muted text-muted-foreground" },
];

function SettingsPage() {
  const [maintenance, setMaintenance] = useState(false);
  const [aiVerify, setAiVerify] = useState(true);
  const [twoFactor, setTwoFactor] = useState(true);
  const [cnicHours, setCnicHours] = useState(12);

  return (
    <div className="min-h-screen bg-surface-muted flex">
      <AdminSidebar active="Settings" />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar>
          <div className="max-w-md relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search settings..."
              className="w-full h-11 pl-11 pr-4 rounded-full bg-surface-muted border border-transparent text-sm focus:outline-none focus:border-brand focus:bg-background transition-all"
            />
          </div>
        </AdminTopbar>

        <main className="flex-1 px-6 lg:px-10 py-8 space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Admin Settings
            </h2>
            <p className="text-muted-foreground mt-1">
              Configure platform-wide parameters and manage administrative access.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left column */}
            <div className="xl:col-span-2 space-y-6">
              {/* Platform Settings */}
              <Card>
                <CardHeader
                  icon={<SettingsIcon className="size-5 text-brand" />}
                  iconBg="bg-brand/10"
                  title="Platform Settings"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
                  <Field label="PLATFORM NAME" defaultValue="ServiceHub Pakistan" />
                  <Field label="SUPPORT EMAIL" defaultValue="support@servicehub.pk" />
                </div>
                <div className="mt-5 flex items-center justify-between p-4 rounded-xl bg-surface-muted/60">
                  <div>
                    <p className="font-bold text-foreground text-sm">Maintenance Mode</p>
                    <p className="text-xs text-muted-foreground">
                      Restrict public access to the platform
                    </p>
                  </div>
                  <Toggle on={maintenance} onChange={setMaintenance} />
                </div>
              </Card>

              {/* Verification Settings */}
              <Card>
                <CardHeader
                  icon={<ShieldCheck className="size-5 text-emerald-600" />}
                  iconBg="bg-emerald-100"
                  title="Verification Settings"
                />
                <div className="mt-5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-foreground text-sm">AI Automated Verification</p>
                    <p className="text-xs text-muted-foreground">
                      Use computer vision for instant ID checks
                    </p>
                  </div>
                  <Toggle on={aiVerify} onChange={setAiVerify} />
                </div>
                <div className="mt-6">
                  <p className="text-[10px] font-bold tracking-widest text-muted-foreground mb-3">
                    CNIC PROCESSING TIME (AVG)
                  </p>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={1}
                      max={24}
                      value={cnicHours}
                      onChange={(e) => setCnicHours(Number(e.target.value))}
                      className="flex-1 accent-brand"
                    />
                    <span className="font-bold text-brand whitespace-nowrap">
                      {cnicHours} Hours
                    </span>
                  </div>
                </div>
              </Card>

              {/* Payment Settings */}
              <Card>
                <CardHeader
                  icon={<Wallet className="size-5 text-orange-500" />}
                  iconBg="bg-orange-100"
                  title="Payment Settings"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
                  <Field label="SERVICE FEE (%)" defaultValue="12.5" suffix="%" />
                  <Field label="MIN WITHDRAWAL (RS.)" defaultValue="5000" suffix="PKR" />
                </div>
              </Card>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Admin Accounts */}
              <Card>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">Admin Accounts</h3>
                  <button className="text-xs font-bold tracking-widest text-brand hover:text-brand-light">
                    ADD ADMIN
                  </button>
                </div>
                <div className="space-y-4 mt-5">
                  {admins.map((a) => (
                    <div key={a.name} className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-brand-foreground font-bold text-xs">
                        {a.name.split(" ").map((p) => p[0]).join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{a.name}</p>
                        <p className="text-[10px] tracking-widest text-muted-foreground">
                          {a.role}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider ${a.statusClass}`}>
                        {a.status}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Security */}
              <Card>
                <CardHeader
                  icon={<Shield className="size-5 text-rose-600" />}
                  iconBg="bg-rose-100"
                  title="Security"
                />
                <div className="mt-5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold tracking-widest text-foreground">
                      TWO-FACTOR (2FA)
                    </p>
                    <p className="text-xs text-muted-foreground">Required for all admins</p>
                  </div>
                  <Toggle on={twoFactor} onChange={setTwoFactor} />
                </div>
                <div className="mt-5">
                  <p className="text-[10px] font-bold tracking-widest text-muted-foreground mb-2">
                    SESSION TIMEOUT
                  </p>
                  <select className="w-full h-11 rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground focus:outline-none focus:border-brand">
                    <option>30 Minutes</option>
                    <option>1 Hour</option>
                    <option>4 Hours</option>
                    <option>8 Hours</option>
                  </select>
                </div>
                <button className="mt-5 w-full h-11 rounded-lg text-rose-600 text-xs font-bold tracking-widest hover:bg-rose-50 transition-colors">
                  FORCE LOGOUT ALL SESSIONS
                </button>
              </Card>

              {/* System Update */}
              <div className="rounded-2xl p-6 bg-gradient-to-br from-brand to-brand-light text-brand-foreground shadow-brand">
                <div className="size-9 rounded-full bg-white/20 flex items-center justify-center mb-3">
                  <Info className="size-5" />
                </div>
                <p className="font-bold text-lg">System Update Available</p>
                <p className="text-sm text-brand-foreground/90 mt-2">
                  ServiceHub v2.4.1 is ready. New analytics modules and faster CNIC verification are included in this release.
                </p>
                <button className="mt-4 w-full h-11 rounded-lg bg-white/20 hover:bg-white/30 text-brand-foreground font-bold text-sm transition-colors">
                  View Changelog
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background rounded-2xl border border-border p-6 shadow-sm">
      {children}
    </div>
  );
}

function CardHeader({
  icon,
  iconBg,
  title,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`size-10 rounded-xl ${iconBg} flex items-center justify-center`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
    </div>
  );
}

function Field({
  label,
  defaultValue,
  suffix,
}: {
  label: string;
  defaultValue: string;
  suffix?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-widest text-muted-foreground mb-2">
        {label}
      </p>
      <div className="relative">
        <input
          defaultValue={defaultValue}
          className="w-full h-11 rounded-full bg-surface-muted border border-transparent px-4 pr-14 text-sm font-semibold text-foreground focus:outline-none focus:border-brand focus:bg-background transition-all"
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative w-12 h-7 rounded-full transition-colors ${
        on ? "bg-brand" : "bg-surface-muted border border-border"
      }`}
    >
      <span
        className={`absolute top-0.5 size-6 rounded-full bg-background shadow transition-transform ${
          on ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

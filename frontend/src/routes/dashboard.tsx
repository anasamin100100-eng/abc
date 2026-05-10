import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  UserRound,
  HardHat,
  Briefcase,
  Search,
  Download,
  TrendingUp,
  HandCoins,
  ExternalLink,
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from "recharts";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard — UstadGo Admin" },
      {
        name: "description",
        content:
          "UstadGo admin dashboard: platform performance, jobs, workers, revenue, and verification queue across Pakistan.",
      },
    ],
  }),
});

const stats = [
  {
    label: "TOTAL USERS",
    value: "3,847",
    change: "12.5%",
    icon: UserRound,
    iconBg: "bg-brand/10",
    iconColor: "text-brand",
  },
  {
    label: "TOTAL WORKERS",
    value: "1,204",
    change: "8.2%",
    icon: HardHat,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    label: "TOTAL JOBS",
    value: "8,932",
    change: "24.1%",
    icon: Briefcase,
    iconBg: "bg-brand/10",
    iconColor: "text-brand",
  },
  {
    label: "TOTAL REVENUE",
    value: "Rs. 2.4M",
    change: "18.7%",
    icon: HandCoins,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-500",
  },
];

const chartData = [
  { day: "MON", posted: 45, completed: 30 },
  { day: "TUE", posted: 75, completed: 55 },
  { day: "WED", posted: 95, completed: 70 },
  { day: "THU", posted: 50, completed: 45 },
  { day: "FRI", posted: 110, completed: 95 },
  { day: "SAT", posted: 85, completed: 75 },
];

const verifications = [
  {
    initials: "BS",
    name: "Bilal Siddiqui",
    role: "Electrician • Karachi Central",
  },
  {
    initials: "FB",
    name: "Faiza Batool",
    role: "Home Cleaner • Clifton",
  },
];

const jobRequests = [
  {
    initials: "ZK",
    client: "Zaid Khan",
    category: "Electrician",
    location: "Gulshan-e-Iqbal",
    budget: "Rs. 2,500",
    status: "PENDING",
    statusClass: "bg-amber-100 text-amber-700",
  },
  {
    initials: "SA",
    client: "Sara Ahmed",
    category: "Plumbing",
    location: "DHA Phase 6",
    budget: "Rs. 1,800",
    status: "ASSIGNED",
    statusClass: "bg-brand/10 text-brand",
  },
  {
    initials: "OM",
    client: "Omar Malik",
    category: "AC Repair",
    location: "North Nazimabad",
    budget: "Rs. 4,500",
    status: "ACTIVE",
    statusClass: "bg-emerald-100 text-emerald-700",
  },
];

type VerificationStatus = "pending" | "approved" | "rejected";

const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;

const karachiMapCenter = {
  lat: 24.8607,
  lng: 67.0011,
};

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

function DashboardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [verificationStatuses, setVerificationStatuses] = useState<
    Record<string, VerificationStatus>
  >(() =>
    verifications.reduce(
      (acc, verification) => ({
        ...acc,
        [verification.name]: "pending" as VerificationStatus,
      }),
      {},
    ),
  );
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const visibleVerifications = useMemo(() => {
    if (!normalizedSearch) return verifications;

    return verifications.filter((verification) =>
      [verification.name, verification.role, verification.initials].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      ),
    );
  }, [normalizedSearch]);

  const visibleJobRequests = useMemo(() => {
    if (!normalizedSearch) return jobRequests;

    return jobRequests.filter((request) =>
      [
        request.client,
        request.category,
        request.location,
        request.budget,
        request.status,
        request.initials,
      ].some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [normalizedSearch]);

  const resultCount = visibleVerifications.length + visibleJobRequests.length;

  const handleVerification = (name: string, nextStatus: Exclude<VerificationStatus, "pending">) => {
    setVerificationStatuses((current) => ({
      ...current,
      [name]: nextStatus,
    }));
    toast.success(`${name} ${nextStatus === "approved" ? "approved" : "rejected"}`, {
      description: "Verification queue updated.",
    });
  };

  const handleExportReports = () => {
    const rows = [
      ["Section", "Name", "Category/Role", "Location/Budget", "Status"],
      ...jobRequests.map((request) => [
        "Job Request",
        request.client,
        request.category,
        request.location,
        `${request.budget} - ${request.status}`,
      ]),
      ...verifications.map((verification) => [
        "Verification",
        verification.name,
        verification.role,
        "",
        verificationStatuses[verification.name] ?? "pending",
      ]),
      ...stats.map((stat) => ["Metric", stat.label, stat.value, "", `${stat.change} growth`]),
    ];
    const csv = rows.map((row) => row.map((cell) => csvEscape(String(cell))).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ustadgo-dashboard-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success("Dashboard report downloaded", {
      description: "The CSV export includes jobs, verification, and metrics.",
    });
  };

  return (
    <div className="min-h-screen bg-surface-muted flex">
      <AdminSidebar active="Dashboard" />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar>
          <div className="max-w-xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search for jobs, workers or clients..."
              className="w-full h-11 pl-11 pr-4 rounded-full bg-surface-muted border border-transparent text-sm focus:outline-none focus:border-brand focus:bg-background transition-all"
            />
          </div>
        </AdminTopbar>

        <main className="flex-1 px-6 lg:px-10 py-8 space-y-8">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Dashboard Overview
              </h2>
              <p className="text-muted-foreground mt-1">
                Platform performance and activity across Pakistan.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportReports}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-gradient-to-br from-brand to-brand-light text-brand-foreground font-semibold text-sm shadow-brand hover:scale-[1.02] active:scale-[0.99] transition-transform"
            >
              <Download className="size-4" />
              Export Reports
            </button>
          </div>
          {searchTerm && (
            <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground">
              {resultCount > 0 ? (
                <>
                  Showing {resultCount} result{resultCount === 1 ? "" : "s"} for{" "}
                  <span className="font-semibold">"{searchTerm}"</span>.
                </>
              ) : (
                <>
                  No dashboard results for <span className="font-semibold">"{searchTerm}"</span>.
                </>
              )}
            </div>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="bg-background rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={`size-12 rounded-xl ${stat.iconBg} flex items-center justify-center`}
                    >
                      <Icon className={`size-6 ${stat.iconColor}`} />
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                      <TrendingUp className="size-3" />
                      {stat.change}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold tracking-widest text-muted-foreground mt-5">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                </div>
              );
            })}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-background rounded-2xl border border-border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-foreground">Jobs Overview</h3>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-2 text-foreground/70">
                    <span className="size-2.5 rounded-full bg-brand" />
                    Posted
                  </span>
                  <span className="flex items-center gap-2 text-foreground/70">
                    <span className="size-2.5 rounded-full bg-emerald-400" />
                    Completed
                  </span>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={6}>
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "var(--muted-foreground)",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                    <Bar dataKey="posted" radius={[8, 8, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill="var(--brand)" fillOpacity={0.35} />
                      ))}
                    </Bar>
                    <Bar dataKey="completed" radius={[8, 8, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill="oklch(0.78 0.13 165)" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-background rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="text-lg font-bold text-foreground mb-5">Verification Queue</h3>
              <div className="space-y-4">
                {visibleVerifications.map((v) => {
                  const status = verificationStatuses[v.name] ?? "pending";
                  return (
                    <div key={v.name} className="p-4 rounded-xl bg-surface-muted/60">
                      <div className="flex items-center gap-3">
                        <div className="size-12 rounded-full bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-brand-foreground font-bold text-sm">
                          {v.initials}
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-sm">{v.name}</p>
                          <p className="text-xs text-muted-foreground">{v.role}</p>
                        </div>
                      </div>
                      {status !== "pending" && (
                        <div
                          className={`mt-3 rounded-lg px-3 py-2 text-xs font-bold ${
                            status === "approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {status === "approved" ? "APPROVED" : "REJECTED"}
                        </div>
                      )}
                      <div className="flex gap-2 mt-3">
                        <button
                          type="button"
                          disabled={status === "approved"}
                          onClick={() => handleVerification(v.name, "approved")}
                          className="flex-1 h-9 rounded-lg bg-brand text-brand-foreground text-xs font-bold hover:bg-brand-light transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={status === "rejected"}
                          onClick={() => handleVerification(v.name, "rejected")}
                          className="flex-1 h-9 rounded-lg border border-border text-foreground text-xs font-bold hover:bg-surface-muted transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
                {visibleVerifications.length === 0 && (
                  <div className="rounded-xl bg-surface-muted/60 p-4 text-sm text-muted-foreground">
                    No workers match this search.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Job Requests + Platform Summary */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-background rounded-2xl border border-border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-foreground">Recent Job Requests</h3>
                <button className="text-sm font-semibold text-brand hover:text-brand-light transition-colors">
                  View All
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] font-bold tracking-widest text-muted-foreground border-b border-border">
                      <th className="text-left py-3 pr-4">CLIENT</th>
                      <th className="text-left py-3 pr-4">JOB CATEGORY</th>
                      <th className="text-left py-3 pr-4">LOCATION</th>
                      <th className="text-left py-3 pr-4">BUDGET</th>
                      <th className="text-left py-3">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleJobRequests.map((r) => (
                      <tr key={r.client} className="border-b border-border last:border-0">
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-full bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-brand-foreground font-bold text-xs">
                              {r.initials}
                            </div>
                            <span className="font-semibold text-foreground">{r.client}</span>
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-foreground/80">{r.category}</td>
                        <td className="py-4 pr-4 text-foreground/80">{r.location}</td>
                        <td className="py-4 pr-4 font-semibold text-foreground">{r.budget}</td>
                        <td className="py-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider ${r.statusClass}`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {visibleJobRequests.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                          No job requests match this search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-background rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="text-lg font-bold text-foreground mb-6">Platform Summary</h3>
              <div className="flex justify-center mb-6">
                <DonutChart />
              </div>
              <div className="space-y-3 text-sm">
                <SummaryRow color="bg-brand" label="Active Jobs" value="65%" />
                <SummaryRow color="bg-emerald-400" label="Completed" value="25%" />
                <SummaryRow color="bg-muted-foreground/40" label="Disputed" value="10%" />
              </div>
            </div>
          </div>

          <GoogleMapsPanel />
        </main>
      </div>
    </div>
  );
}

function SummaryRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2.5 text-foreground/80">
        <span className={`size-2.5 rounded-full ${color}`} />
        {label}
      </span>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  );
}

function DonutChart() {
  const radius = 70;
  const stroke = 18;
  const circumference = 2 * Math.PI * radius;
  const segments = [
    { value: 65, color: "var(--brand)" },
    { value: 25, color: "oklch(0.78 0.13 165)" },
    { value: 10, color: "oklch(0.9 0.005 255)" },
  ];

  let offset = 0;
  return (
    <div className="relative size-44">
      <svg viewBox="0 0 180 180" className="size-full -rotate-90">
        {segments.map((seg, i) => {
          const length = (seg.value / 100) * circumference;
          const dasharray = `${length} ${circumference - length}`;
          const dashoffset = -offset;
          offset += length;
          return (
            <circle
              key={i}
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={dasharray}
              strokeDashoffset={dashoffset}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-3xl font-bold text-foreground">84%</p>
        <p className="text-[10px] font-bold tracking-widest text-muted-foreground">EFFICIENCY</p>
      </div>
    </div>
  );
}

function GoogleMapsPanel() {
  const mapUrl = googleMapsApiKey
    ? `https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(
        googleMapsApiKey,
      )}&center=${karachiMapCenter.lat},${karachiMapCenter.lng}&zoom=12&maptype=roadmap`
    : "";
  const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${karachiMapCenter.lat},${karachiMapCenter.lng}`;

  return (
    <div className="bg-background rounded-2xl border border-border overflow-hidden shadow-sm">
      <div className="relative h-80 bg-slate-100">
        {mapUrl ? (
          <iframe
            title="Active jobs near Karachi"
            src={mapUrl}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-muted px-6 text-center">
            <div className="max-w-md">
              <p className="text-lg font-bold text-foreground">Google Maps API key needed</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Add your key as VITE_GOOGLE_MAPS_API_KEY, restart the frontend, and this dashboard
                panel will render the live Google map.
              </p>
            </div>
          </div>
        )}
        <div className="absolute top-5 left-5 bg-background/95 backdrop-blur rounded-xl px-4 py-3 shadow-md">
          <p className="font-bold text-sm text-foreground">Active Jobs Near Karachi</p>
          <div className="flex items-center gap-4 mt-1.5 text-[10px] font-bold tracking-widest">
            <span className="flex items-center gap-1.5 text-foreground/70">
              <span className="size-2 rounded-full bg-brand" />
              URGENT
            </span>
            <span className="flex items-center gap-1.5 text-foreground/70">
              <span className="size-2 rounded-full bg-orange-400" />
              SCHEDULED
            </span>
          </div>
        </div>
        <a
          href={googleMapsLink}
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-5 right-5 inline-flex h-10 items-center gap-2 rounded-xl bg-background px-4 text-sm font-semibold text-foreground shadow-md hover:bg-surface-muted"
        >
          <ExternalLink className="size-4" />
          Open map
        </a>
      </div>
    </div>
  );
}

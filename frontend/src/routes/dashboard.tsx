import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { apiFetch } from "@/utils/api";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard - UstadGo Admin" },
      {
        name: "description",
        content:
          "UstadGo admin dashboard: platform performance, jobs, workers, revenue, and verification queue across Pakistan.",
      },
    ],
  }),
});

type VerificationStatus = "pending" | "approved" | "rejected";
type JobStatus = "pending" | "assigned" | "in_progress" | "completed" | "cancelled";

type DashboardStats = {
  totals: {
    users: number;
    workers: number;
    clients: number;
    services: number;
    jobs: number;
    payments: number;
    revenue: number;
    pendingPayments: number;
  };
  workers: {
    pending: number;
    approved: number;
    rejected: number;
  };
  jobs: {
    pending: number;
    assigned: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
  payments: {
    pending: number;
    completed: number;
    failed: number;
    refunded: number;
  };
  chartData: Array<{
    day: string;
    posted: number;
    completed: number;
  }>;
  pendingWorkers: Array<{
    id: string;
    initials: string;
    name: string;
    role: string;
  }>;
  recentJobs: Array<{
    id: string;
    jobId: string;
    initials: string;
    client: string;
    worker: string;
    category: string;
    location: string;
    budget: string;
    status: JobStatus;
  }>;
};

const emptyStats: DashboardStats = {
  totals: {
    users: 0,
    workers: 0,
    clients: 0,
    services: 0,
    jobs: 0,
    payments: 0,
    revenue: 0,
    pendingPayments: 0,
  },
  workers: {
    pending: 0,
    approved: 0,
    rejected: 0,
  },
  jobs: {
    pending: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  },
  payments: {
    pending: 0,
    completed: 0,
    failed: 0,
    refunded: 0,
  },
  chartData: [],
  pendingWorkers: [],
  recentJobs: [],
};

const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;

const karachiMapCenter = {
  lat: 24.8607,
  lng: 67.0011,
};

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

const jobStatusClasses: Record<JobStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  assigned: "bg-brand/10 text-brand",
  in_progress: "bg-cyan-100 text-cyan-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

const jobStatusLabels: Record<JobStatus, string> = {
  pending: "PENDING",
  assigned: "ASSIGNED",
  in_progress: "IN PROGRESS",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
};

const formatNumber = (value: number) => value.toLocaleString();
const formatCurrency = (value: number) => `Rs. ${value.toLocaleString()}`;

function DashboardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [updatingWorkerId, setUpdatingWorkerId] = useState<string | null>(null);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const loadStats = async () => {
    setLoading(true);

    try {
      const response = await apiFetch("/dashboard/stats");

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Could not load dashboard stats");
      }

      setStats((await response.json()) as DashboardStats);
    } catch (error) {
      toast.error("Dashboard stats could not be loaded", {
        description: error instanceof Error ? error.message : "Please restart the backend server.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const statCards = [
    {
      label: "TOTAL USERS",
      value: formatNumber(stats.totals.users),
      subtext: `${formatNumber(stats.totals.clients)} clients`,
      icon: UserRound,
      iconBg: "bg-brand/10",
      iconColor: "text-brand",
    },
    {
      label: "TOTAL WORKERS",
      value: formatNumber(stats.totals.workers),
      subtext: `${formatNumber(stats.workers.pending)} pending approval`,
      icon: HardHat,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      label: "TOTAL JOBS",
      value: formatNumber(stats.totals.jobs),
      subtext: `${formatNumber(stats.jobs.completed)} completed`,
      icon: Briefcase,
      iconBg: "bg-brand/10",
      iconColor: "text-brand",
    },
    {
      label: "TOTAL REVENUE",
      value: formatCurrency(stats.totals.revenue),
      subtext: `${formatNumber(stats.payments.pending)} pending payments`,
      icon: HandCoins,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-500",
    },
  ];

  const visibleVerifications = useMemo(() => {
    if (!normalizedSearch) return stats.pendingWorkers;

    return stats.pendingWorkers.filter((worker) =>
      [worker.name, worker.role, worker.initials].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      ),
    );
  }, [normalizedSearch, stats.pendingWorkers]);

  const visibleJobRequests = useMemo(() => {
    if (!normalizedSearch) return stats.recentJobs;

    return stats.recentJobs.filter((request) =>
      [
        request.jobId,
        request.client,
        request.worker,
        request.category,
        request.location,
        request.budget,
        jobStatusLabels[request.status],
        request.initials,
      ].some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [normalizedSearch, stats.recentJobs]);

  const resultCount = visibleVerifications.length + visibleJobRequests.length;
  const activeJobs = stats.jobs.pending + stats.jobs.assigned + stats.jobs.inProgress;
  const totalJobsForSummary = Math.max(stats.totals.jobs, 1);
  const activePercent = Math.round((activeJobs / totalJobsForSummary) * 100);
  const completedPercent = Math.round((stats.jobs.completed / totalJobsForSummary) * 100);
  const cancelledPercent = Math.max(0, 100 - activePercent - completedPercent);

  const handleVerification = async (
    workerId: string,
    name: string,
    nextStatus: Exclude<VerificationStatus, "pending">,
  ) => {
    setUpdatingWorkerId(workerId);

    try {
      const response = await apiFetch(`/workers/${workerId}`, {
        method: "PUT",
        body: JSON.stringify({ verification_status: nextStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Worker verification update failed");
      }

      toast.success(`${name} ${nextStatus === "approved" ? "approved" : "rejected"}`, {
        description: "Dashboard stats refreshed from MongoDB.",
      });
      await loadStats();
    } catch (error) {
      toast.error("Verification was not updated", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setUpdatingWorkerId(null);
    }
  };

  const handleExportReports = () => {
    const rows = [
      ["Section", "Name", "Category/Role", "Location/Budget", "Status"],
      ...stats.recentJobs.map((request) => [
        "Job Request",
        `${request.jobId} - ${request.client}`,
        request.category,
        `${request.location} / ${request.budget}`,
        jobStatusLabels[request.status],
      ]),
      ...stats.pendingWorkers.map((worker) => [
        "Verification",
        worker.name,
        worker.role,
        "",
        "pending",
      ]),
      ...statCards.map((stat) => ["Metric", stat.label, stat.value, "", stat.subtext]),
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
      description: "The CSV export includes live MongoDB jobs, verification, and metrics.",
    });
  };

  return (
    <div className="min-h-screen bg-surface-muted flex">
      <AdminSidebar active="Dashboard" />

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
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Dashboard Overview
              </h2>
              <p className="text-muted-foreground mt-1">
                Live platform performance from MongoDB.
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

          {loading && (
            <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
              Loading live dashboard stats...
            </div>
          )}

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

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {statCards.map((stat) => {
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
                      Live
                    </span>
                  </div>
                  <p className="text-[11px] font-bold tracking-widest text-muted-foreground mt-5">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">{stat.subtext}</p>
                </div>
              );
            })}
          </div>

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
                  <BarChart data={stats.chartData} barGap={6}>
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
                      {stats.chartData.map((_, i) => (
                        <Cell key={i} fill="var(--brand)" fillOpacity={0.35} />
                      ))}
                    </Bar>
                    <Bar dataKey="completed" radius={[8, 8, 0, 0]}>
                      {stats.chartData.map((_, i) => (
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
                {visibleVerifications.map((worker) => (
                  <div key={worker.id} className="p-4 rounded-xl bg-surface-muted/60">
                    <div className="flex items-center gap-3">
                      <div className="size-12 rounded-full bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-brand-foreground font-bold text-sm">
                        {worker.initials}
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">{worker.name}</p>
                        <p className="text-xs text-muted-foreground">{worker.role}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        disabled={updatingWorkerId === worker.id}
                        onClick={() => handleVerification(worker.id, worker.name, "approved")}
                        className="flex-1 h-9 rounded-lg bg-brand text-brand-foreground text-xs font-bold hover:bg-brand-light transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={updatingWorkerId === worker.id}
                        onClick={() => handleVerification(worker.id, worker.name, "rejected")}
                        className="flex-1 h-9 rounded-lg border border-border text-foreground text-xs font-bold hover:bg-surface-muted transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                {visibleVerifications.length === 0 && (
                  <div className="rounded-xl bg-surface-muted/60 p-4 text-sm text-muted-foreground">
                    No pending workers match this search.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-background rounded-2xl border border-border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-foreground">Recent Job Requests</h3>
                <Link
                  to="/job-requests"
                  className="text-sm font-semibold text-brand hover:text-brand-light transition-colors"
                >
                  View All
                </Link>
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
                    {visibleJobRequests.map((request) => (
                      <tr key={request.id} className="border-b border-border last:border-0">
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-full bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-brand-foreground font-bold text-xs">
                              {request.initials}
                            </div>
                            <div>
                              <span className="font-semibold text-foreground">{request.client}</span>
                              <p className="text-xs text-muted-foreground">
                                Worker: {request.worker}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-foreground/80">{request.category}</td>
                        <td className="py-4 pr-4 text-foreground/80">{request.location}</td>
                        <td className="py-4 pr-4 font-semibold text-foreground">
                          {request.budget}
                        </td>
                        <td className="py-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider ${jobStatusClasses[request.status]}`}
                          >
                            {jobStatusLabels[request.status]}
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
                <DonutChart
                  activePercent={activePercent}
                  completedPercent={completedPercent}
                  cancelledPercent={cancelledPercent}
                />
              </div>
              <div className="space-y-3 text-sm">
                <SummaryRow color="bg-brand" label="Active Jobs" value={`${activePercent}%`} />
                <SummaryRow
                  color="bg-emerald-400"
                  label="Completed"
                  value={`${completedPercent}%`}
                />
                <SummaryRow
                  color="bg-muted-foreground/40"
                  label="Cancelled"
                  value={`${cancelledPercent}%`}
                />
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

function DonutChart({
  activePercent,
  cancelledPercent,
  completedPercent,
}: {
  activePercent: number;
  cancelledPercent: number;
  completedPercent: number;
}) {
  const radius = 70;
  const stroke = 18;
  const circumference = 2 * Math.PI * radius;
  const segments = [
    { value: activePercent, color: "var(--brand)" },
    { value: completedPercent, color: "oklch(0.78 0.13 165)" },
    { value: cancelledPercent, color: "oklch(0.9 0.005 255)" },
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
        <p className="text-3xl font-bold text-foreground">{completedPercent}%</p>
        <p className="text-[10px] font-bold tracking-widest text-muted-foreground">COMPLETED</p>
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
    <div className="bg-background rounded-2xl border border-border shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold text-sm text-foreground">Active Jobs Near Karachi</p>
          <div className="flex flex-wrap items-center gap-4 mt-1.5 text-[10px] font-bold tracking-widest">
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
          className="inline-flex h-10 w-fit items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm hover:bg-surface-muted"
        >
          <ExternalLink className="size-4" />
          Open in Maps
        </a>
      </div>
      <div className="relative h-80 overflow-hidden rounded-b-2xl bg-slate-100">
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
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Calendar, Download, Search, Star, TrendingUp } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis } from "recharts";
import { apiFetch } from "@/utils/api";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
  head: () => ({
    meta: [{ title: "Analytics - UstadGo Admin" }],
  }),
});

type User = { _id: string; name?: string; role?: string };
type Worker = {
  _id: string;
  user_id?: string;
  service_id?: string;
  rating?: number;
  total_jobs?: number;
  reliability_score?: number;
};
type Service = { _id: string; name?: string; category_type?: string };
type Job = { _id: string; service_id?: string; status?: string; location?: string; requested_at?: string };
type Payment = { worker_id?: string; amount?: number; payment_status?: string; paid_at?: string };

const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;
const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN"];

function AnalyticsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      try {
        const [usersResponse, workersResponse, servicesResponse, jobsResponse, paymentsResponse] =
          await Promise.all([
            apiFetch("/users"),
            apiFetch("/workers"),
            apiFetch("/services"),
            apiFetch("/jobs"),
            apiFetch("/payments"),
          ]);

        if (
          !usersResponse.ok ||
          !workersResponse.ok ||
          !servicesResponse.ok ||
          !jobsResponse.ok ||
          !paymentsResponse.ok
        ) {
          throw new Error("Could not load analytics data from backend");
        }

        const [nextUsers, nextWorkers, nextServices, nextJobs, nextPayments] =
          (await Promise.all([
            usersResponse.json(),
            workersResponse.json(),
            servicesResponse.json(),
            jobsResponse.json(),
            paymentsResponse.json(),
          ])) as [User[], Worker[], Service[], Job[], Payment[]];

        setUsers(nextUsers);
        setWorkers(nextWorkers);
        setServices(nextServices);
        setJobs(nextJobs);
        setPayments(nextPayments);
      } catch (error) {
        toast.error("Analytics could not be loaded", {
          description: error instanceof Error ? error.message : "Please check backend/login.",
        });
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  const usersById = useMemo(() => new Map(users.map((user) => [user._id, user])), [users]);
  const servicesById = useMemo(
    () => new Map(services.map((service) => [service._id, service])),
    [services],
  );

  const completedPayments = payments.filter((payment) => payment.payment_status === "completed");
  const revenue = completedPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const completedJobs = jobs.filter((job) => job.status === "completed").length;
  const avgValue = completedPayments.length ? Math.round(revenue / completedPayments.length) : 0;

  const stats = [
    { label: "USERS", value: users.length.toLocaleString() },
    { label: "WORKERS", value: workers.length.toLocaleString() },
    { label: "JOBS POSTED", value: jobs.length.toLocaleString() },
    { label: "COMPLETED", value: completedJobs.toLocaleString() },
    { label: "REVENUE", value: `Rs. ${revenue.toLocaleString()}` },
    { label: "AVG VALUE", value: `Rs. ${avgValue.toLocaleString()}` },
  ];

  const revenueBars = months.map((month, index) => ({
    month,
    v: completedPayments
      .filter((payment) => payment.paid_at && new Date(payment.paid_at).getMonth() === index)
      .reduce((sum, payment) => sum + (payment.amount || 0), 0),
  }));

  const categoryData = services.map((service) => {
    const count = jobs.filter((job) => job.service_id === service._id).length;
    return {
      name: service.name || "General Service",
      value: count,
    };
  });
  const maxCategory = Math.max(1, ...categoryData.map((category) => category.value));
  const visibleCategories = categoryData
    .filter((category) => !normalizedSearch || category.name.toLowerCase().includes(normalizedSearch))
    .map((category) => ({
      ...category,
      pct: Math.round((category.value / maxCategory) * 100),
    }));

  const topWorkers = workers
    .map((worker) => {
      const user = worker.user_id ? usersById.get(worker.user_id) : undefined;
      const workerRevenue = completedPayments
        .filter((payment) => payment.worker_id === worker.user_id)
        .reduce((sum, payment) => sum + (payment.amount || 0), 0);

      return {
        name: user?.name || "Unknown Worker",
        initials: initials(user?.name || "Worker"),
        rating: worker.rating || 0,
        jobs: worker.total_jobs || 0,
        reliability: Math.round(worker.reliability_score || 0),
        service: worker.service_id ? servicesById.get(worker.service_id)?.name || "Service" : "Service",
        revenue: workerRevenue,
      };
    })
    .filter(
      (worker) =>
        !normalizedSearch ||
        [worker.name, worker.service].some((value) => value.toLowerCase().includes(normalizedSearch)),
    )
    .sort((a, b) => b.reliability - a.reliability);

  const cityData = Array.from(
    jobs.reduce((map, job) => {
      const city = extractCity(job.location);
      map.set(city, (map.get(city) || 0) + 1);
      return map;
    }, new Map<string, number>()),
  ).map(([city, count]) => ({ city, jobs: count }));

  const handleExportReports = () => {
    const rows = [
      ["Metric", "Value"],
      ...stats.map((stat) => [stat.label, stat.value]),
      [],
      ["Category", "Jobs"],
      ...visibleCategories.map((category) => [category.name, category.value]),
      [],
      ["Worker", "Service", "Rating", "Jobs", "Reliability", "Revenue"],
      ...topWorkers.map((worker) => [
        worker.name,
        worker.service,
        worker.rating,
        worker.jobs,
        `${worker.reliability}%`,
        `Rs. ${worker.revenue.toLocaleString()}`,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => csvEscape(String(cell))).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ustadgo-analytics.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success("Analytics report downloaded");
  };

  return (
    <div className="min-h-screen flex bg-surface-muted">
      <AdminSidebar active="Analytics" />
      <div className="flex-1 min-w-0 flex flex-col">
        <AdminTopbar>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search analytics..."
              className="w-full bg-surface-muted border border-border rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
        </AdminTopbar>

        <main className="flex-1 px-6 lg:px-10 py-8 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Analytics Deep-Dive</h1>
              <p className="text-muted-foreground mt-1">
                Real-time performance from users, workers, jobs, services, and payments.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportReports}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-brand to-brand-light text-brand-foreground text-sm font-semibold shadow-lg"
            >
              <Download className="size-4" /> Export Reports
            </button>
          </div>

          {loading && (
            <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
              Loading analytics from backend...
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-background rounded-2xl p-5 border border-border">
                <p className="text-[10px] tracking-widest font-semibold text-muted-foreground">
                  {stat.label}
                </p>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <p className="text-2xl font-bold leading-none">{stat.value}</p>
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                    <TrendingUp className="size-3" />
                    Live
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-background rounded-2xl p-6 border border-border">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold">Revenue Over Time</h3>
                  <p className="text-sm text-muted-foreground">Completed payment revenue by month</p>
                </div>
                <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Calendar className="size-4" /> This Year
                </span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueBars}>
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Bar dataKey="v" radius={[12, 12, 12, 12]}>
                      {revenueBars.map((bar, index) => (
                        <Cell
                          key={bar.month}
                          fill={index % 2 === 0 ? "hsl(var(--brand))" : "hsl(var(--brand) / 0.6)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-background rounded-2xl p-6 border border-border">
              <h3 className="text-lg font-bold">Jobs by Service</h3>
              <p className="text-sm text-muted-foreground">Most requested service categories</p>
              <div className="mt-6 space-y-5">
                {visibleCategories.map((category) => (
                  <div key={category.name}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium">{category.name}</span>
                      <span className="font-semibold">{category.value}</span>
                    </div>
                    <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand to-brand-light"
                        style={{ width: `${category.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-background rounded-2xl p-6 border border-border">
              <h3 className="text-lg font-bold mb-5">Top Performing Workers</h3>
              <div className="grid grid-cols-12 text-[10px] tracking-widest font-semibold text-muted-foreground pb-3 border-b border-border">
                <div className="col-span-5">WORKER</div>
                <div className="col-span-2">RATING</div>
                <div className="col-span-2">JOBS</div>
                <div className="col-span-3 text-right">REVENUE</div>
              </div>
              {topWorkers.slice(0, 6).map((worker) => (
                <div
                  key={worker.name}
                  className="grid grid-cols-12 items-center py-4 border-b border-border last:border-0 text-sm"
                >
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="size-10 rounded-full bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-brand-foreground text-xs font-bold">
                      {worker.initials}
                    </div>
                    <div>
                      <p className="font-semibold">{worker.name}</p>
                      <p className="text-xs text-muted-foreground">{worker.service}</p>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center gap-1">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-semibold">{worker.rating.toFixed(1)}</span>
                  </div>
                  <div className="col-span-2 font-semibold">{worker.jobs}</div>
                  <div className="col-span-3 text-right font-bold">
                    Rs. {worker.revenue.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-background rounded-2xl p-6 border border-border">
              <h3 className="text-lg font-bold mb-5">City Performance</h3>
              <div className="grid grid-cols-12 text-[10px] tracking-widest font-semibold text-muted-foreground pb-3 border-b border-border">
                <div className="col-span-6">LOCATION</div>
                <div className="col-span-3">JOBS</div>
                <div className="col-span-3 text-right">SHARE</div>
              </div>
              {cityData.map((city) => {
                const pct = Math.round((city.jobs / Math.max(1, jobs.length)) * 100);
                return (
                  <div
                    key={city.city}
                    className="grid grid-cols-12 items-center py-4 border-b border-border last:border-0 text-sm"
                  >
                    <div className="col-span-6 font-semibold">{city.city}</div>
                    <div className="col-span-3 font-semibold">{city.jobs}</div>
                    <div className="col-span-3 text-right font-bold text-brand">{pct}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function extractCity(location?: string) {
  if (!location) return "Unknown";
  const parts = location.split(",").map((part) => part.trim());
  return parts[parts.length - 1] || location;
}

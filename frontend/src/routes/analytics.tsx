import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  Calendar,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  MapPin,
  Star,
  Clock,
  Download,
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from "recharts";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
  head: () => ({
    meta: [
      { title: "Analytics — UstadGo Admin" },
      {
        name: "description",
        content:
          "Analytics deep-dive for UstadGo: real-time performance, revenue, jobs by category, top workers, and city performance.",
      },
    ],
  }),
});

const stats = [
  { label: "NEW USERS", value: "1,284", trend: "+12%", up: true },
  { label: "WORKERS", value: "452", trend: "+5%", up: true },
  { label: "JOBS POSTED", value: "8,902", trend: "0%", up: null },
  { label: "COMPLETED", value: "7,431", trend: "+8%", up: true },
  { label: "REVENUE", value: "Rs. 1.2M", trend: "+24%", up: true },
  { label: "AVG VALUE", value: "Rs. 2,450", trend: "-2%", up: false },
];

const revenueBars = [
  { month: "JAN", v: 40 },
  { month: "FEB", v: 55 },
  { month: "MAR", v: 90 },
  { month: "APR", v: 100 },
  { month: "MAY", v: 70 },
  { month: "JUN", v: 45 },
];

const categories = [
  { name: "Home Maintenance", value: 2400, pct: 100 },
  { name: "Cleaning Services", value: 1850, pct: 77 },
  { name: "Education/Tutoring", value: 1200, pct: 50 },
  { name: "Beauty & Wellness", value: 980, pct: 41 },
  { name: "Tech Support", value: 450, pct: 19 },
];

const topWorkers = [
  {
    name: "Zubair Ahmed",
    city: "Karachi",
    rating: 4.9,
    jobs: 124,
    rev: "Rs. 84,200",
    initials: "ZA",
  },
  { name: "Sana Malik", city: "Lahore", rating: 4.8, jobs: 98, rev: "Rs. 62,150", initials: "SM" },
  {
    name: "Irfan Farooq",
    city: "Islamabad",
    rating: 5.0,
    jobs: 76,
    rev: "Rs. 58,900",
    initials: "IF",
  },
  {
    name: "Bilal Siddiqui",
    city: "Karachi",
    rating: 4.7,
    jobs: 69,
    rev: "Rs. 51,300",
    initials: "BS",
  },
  {
    name: "Faiza Batool",
    city: "Rawalpindi",
    rating: 4.6,
    jobs: 61,
    rev: "Rs. 43,850",
    initials: "FB",
  },
  {
    name: "Maham Qureshi",
    city: "Lahore",
    rating: 4.8,
    jobs: 55,
    rev: "Rs. 39,700",
    initials: "MQ",
  },
];

const cityPerf = [
  { city: "Karachi", jobs: 3412, eff: 92, growth: "+18.4%", up: true, color: "bg-emerald-500" },
  { city: "Lahore", jobs: 2890, eff: 88, growth: "+12.2%", up: true, color: "bg-emerald-500" },
  { city: "Islamabad", jobs: 1205, eff: 95, growth: "+5.7%", up: true, color: "bg-brand" },
  { city: "Rawalpindi", jobs: 1142, eff: 74, growth: "-2.1%", up: false, color: "bg-amber-500" },
];

const dateRanges = ["Last 7 Days", "Last 30 Days", "Last 90 Days", "This Year"] as const;
const cityFilters = ["All Cities", ...cityPerf.map((city) => city.city)] as const;
const categoryFilters = ["All Categories", ...categories.map((category) => category.name)] as const;

const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;

function AnalyticsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<(typeof dateRanges)[number]>("Last 30 Days");
  const [cityFilter, setCityFilter] = useState<(typeof cityFilters)[number]>("All Cities");
  const [categoryFilter, setCategoryFilter] =
    useState<(typeof categoryFilters)[number]>("All Categories");
  const [showAllWorkers, setShowAllWorkers] = useState(false);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const hasActiveFilters =
    cityFilter !== "All Cities" || categoryFilter !== "All Categories" || Boolean(normalizedSearch);

  const visibleCategories = useMemo(() => {
    return categories.filter((category) => {
      const matchesCategory =
        categoryFilter === "All Categories" || category.name === categoryFilter;
      const matchesSearch =
        !normalizedSearch || category.name.toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, normalizedSearch]);

  const visibleWorkers = useMemo(() => {
    return topWorkers.filter((worker) => {
      const matchesCity = cityFilter === "All Cities" || worker.city === cityFilter;
      const matchesSearch =
        !normalizedSearch ||
        [worker.name, worker.city, worker.initials].some((value) =>
          value.toLowerCase().includes(normalizedSearch),
        );

      return matchesCity && matchesSearch;
    });
  }, [cityFilter, normalizedSearch]);

  const visibleCities = useMemo(() => {
    return cityPerf.filter((city) => {
      const matchesCity = cityFilter === "All Cities" || city.city === cityFilter;
      const matchesSearch = !normalizedSearch || city.city.toLowerCase().includes(normalizedSearch);

      return matchesCity && matchesSearch;
    });
  }, [cityFilter, normalizedSearch]);

  const workersToShow = showAllWorkers ? visibleWorkers : visibleWorkers.slice(0, 3);
  const resultCount = visibleCategories.length + visibleWorkers.length + visibleCities.length;

  const handleExportReports = () => {
    const rows = [
      ["Report", "Analytics"],
      ["Date Range", dateRange],
      ["City Filter", cityFilter],
      ["Category Filter", categoryFilter],
      [],
      ["Metric", "Value", "Trend"],
      ...stats.map((stat) => [stat.label, stat.value, stat.trend]),
      [],
      ["Category", "Jobs", "Share"],
      ...visibleCategories.map((category) => [category.name, category.value, `${category.pct}%`]),
      [],
      ["Worker", "City", "Rating", "Jobs", "Revenue"],
      ...visibleWorkers.map((worker) => [
        worker.name,
        worker.city,
        worker.rating,
        worker.jobs,
        worker.rev,
      ]),
      [],
      ["City", "Active Jobs", "Efficiency", "Growth"],
      ...visibleCities.map((city) => [city.city, city.jobs, `${city.eff}%`, city.growth]),
    ];
    const csv = rows.map((row) => row.map((cell) => csvEscape(String(cell))).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ustadgo-analytics-${dateRange.toLowerCase().replaceAll(" ", "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success("Analytics report downloaded", {
      description: "The CSV includes the active search, date range, and filters.",
    });
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
                Real-time performance overview across Pakistan
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-background border border-border text-sm font-semibold">
                    <Calendar className="size-4" />
                    {dateRange}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-52 rounded-xl p-2">
                  {dateRanges.map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setDateRange(range)}
                      className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                        dateRange === range
                          ? "bg-brand text-brand-foreground"
                          : "text-foreground/80 hover:bg-surface-muted"
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-brand-foreground text-sm font-semibold">
                    <SlidersHorizontal className="size-4" />
                    Filters
                    {hasActiveFilters && (
                      <span className="size-2 rounded-full bg-brand-foreground" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 rounded-xl">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-bold tracking-widest text-muted-foreground">
                        CITY
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {cityFilters.map((city) => (
                          <button
                            key={city}
                            type="button"
                            onClick={() => setCityFilter(city)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                              cityFilter === city
                                ? "border-brand bg-brand text-brand-foreground"
                                : "border-border hover:bg-surface-muted"
                            }`}
                          >
                            {city}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold tracking-widest text-muted-foreground">
                        CATEGORY
                      </p>
                      <div className="mt-2 grid grid-cols-1 gap-2">
                        {categoryFilters.map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => setCategoryFilter(category)}
                            className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold ${
                              categoryFilter === category
                                ? "border-brand bg-brand text-brand-foreground"
                                : "border-border hover:bg-surface-muted"
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCityFilter("All Cities");
                        setCategoryFilter("All Categories");
                        setSearchTerm("");
                      }}
                      className="w-full rounded-lg border border-border py-2 text-sm font-semibold hover:bg-surface-muted"
                    >
                      Clear filters
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {(searchTerm || hasActiveFilters) && (
            <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground">
              Showing {resultCount} analytics result{resultCount === 1 ? "" : "s"} for {dateRange}.
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-background rounded-2xl p-5 border border-border">
                <p className="text-[10px] tracking-widest font-semibold text-muted-foreground">
                  {s.label}
                </p>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <p className="text-2xl font-bold leading-none">{s.value}</p>
                  <span
                    className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                      s.up === true
                        ? "bg-emerald-500/10 text-emerald-600"
                        : s.up === false
                          ? "bg-red-500/10 text-red-600"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.up === true && <TrendingUp className="size-3" />}
                    {s.up === false && <TrendingDown className="size-3" />}
                    {s.trend}
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
                  <p className="text-sm text-muted-foreground">Projected vs Actual Revenue (PKR)</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-brand" /> Actual
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-brand-light" /> Projected
                  </span>
                </div>
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
                      {revenueBars.map((b, i) => (
                        <Cell
                          key={i}
                          fill={
                            b.v > 80
                              ? "hsl(var(--brand))"
                              : b.v > 50
                                ? "hsl(var(--brand) / 0.7)"
                                : "hsl(var(--brand) / 0.35)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-background rounded-2xl p-6 border border-border">
              <h3 className="text-lg font-bold">Jobs by Category</h3>
              <p className="text-sm text-muted-foreground">Most requested service sectors</p>
              <div className="mt-6 space-y-5">
                {visibleCategories.map((c) => (
                  <div key={c.name}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium">{c.name}</span>
                      <span className="font-semibold">{c.value.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand to-brand-light"
                        style={{ width: `${c.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
                {visibleCategories.length === 0 && (
                  <p className="rounded-xl bg-surface-muted p-4 text-sm text-muted-foreground">
                    No categories match the current search or filter.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-background rounded-2xl p-6 border border-border">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold">Top Performing Workers</h3>
                <button
                  type="button"
                  onClick={() => setShowAllWorkers((current) => !current)}
                  className="text-sm font-semibold text-brand"
                >
                  {showAllWorkers ? "Show Less" : "View All"}
                </button>
              </div>
              <div className="grid grid-cols-12 text-[10px] tracking-widest font-semibold text-muted-foreground pb-3 border-b border-border">
                <div className="col-span-5">WORKER</div>
                <div className="col-span-2">RATING</div>
                <div className="col-span-2">JOBS</div>
                <div className="col-span-3 text-right">REVENUE</div>
              </div>
              {workersToShow.map((w) => (
                <div
                  key={w.name}
                  className="grid grid-cols-12 items-center py-4 border-b border-border last:border-0 text-sm"
                >
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="size-10 rounded-full bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-brand-foreground text-xs font-bold">
                      {w.initials}
                    </div>
                    <div>
                      <p className="font-semibold">{w.name}</p>
                      <p className="text-xs text-muted-foreground">{w.city}</p>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center gap-1">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-semibold">{w.rating}</span>
                  </div>
                  <div className="col-span-2 font-semibold">{w.jobs}</div>
                  <div className="col-span-3 text-right font-bold">{w.rev}</div>
                </div>
              ))}
              {workersToShow.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No workers match the current search or city filter.
                </p>
              )}
            </div>

            <div className="bg-background rounded-2xl p-6 border border-border">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold">City Performance</h3>
                <span className="flex items-center gap-1.5 text-[10px] tracking-widest font-semibold text-muted-foreground">
                  <Clock className="size-3" /> LAST SYNC: 2:00 PM PKT
                </span>
              </div>
              <div className="grid grid-cols-12 text-[10px] tracking-widest font-semibold text-muted-foreground pb-3 border-b border-border">
                <div className="col-span-3">LOCATION</div>
                <div className="col-span-3">ACTIVE JOBS</div>
                <div className="col-span-3">EFFICIENCY</div>
                <div className="col-span-3 text-right">GROWTH</div>
              </div>
              {visibleCities.map((c) => (
                <div
                  key={c.city}
                  className="grid grid-cols-12 items-center py-4 border-b border-border last:border-0 text-sm"
                >
                  <div className="col-span-3 flex items-center gap-2 font-semibold">
                    <MapPin className="size-4 text-brand" /> {c.city}
                  </div>
                  <div className="col-span-3 font-semibold">{c.jobs.toLocaleString()}</div>
                  <div className="col-span-3 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-surface-muted rounded-full overflow-hidden">
                      <div className={`h-full ${c.color}`} style={{ width: `${c.eff}%` }} />
                    </div>
                    <span className="text-xs font-semibold">{c.eff}%</span>
                  </div>
                  <div
                    className={`col-span-3 text-right font-bold ${c.up ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {c.growth}
                  </div>
                </div>
              ))}
              {visibleCities.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No cities match the current search or filter.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleExportReports}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-brand to-brand-light text-brand-foreground text-sm font-semibold shadow-lg"
            >
              <Download className="size-4" /> Export Reports
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

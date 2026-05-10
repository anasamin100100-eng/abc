import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Plus, Zap, Wrench, Hammer, Brush, Sparkles } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from "recharts";

export const Route = createFileRoute("/services")({
  component: ServicesPage,
  head: () => ({
    meta: [
      { title: "Services - UstadGo Admin" },
      {
        name: "description",
        content:
          "Manage UstadGo service categories, worker distribution, and market demand across Pakistan.",
      },
    ],
  }),
});

type Service = {
  name: string;
  category: string;
  workers: number;
  jobs: number;
  icon: typeof Zap;
  tone: string;
  jobsTone: string;
};

const serviceTones = [
  { icon: Zap, tone: "text-brand bg-brand/10", jobsTone: "text-brand" },
  { icon: Wrench, tone: "text-cyan-600 bg-cyan-500/10", jobsTone: "text-cyan-600" },
  { icon: Hammer, tone: "text-amber-600 bg-amber-500/10", jobsTone: "text-amber-600" },
  { icon: Brush, tone: "text-violet-600 bg-violet-500/10", jobsTone: "text-violet-600" },
  { icon: Sparkles, tone: "text-rose-600 bg-rose-500/10", jobsTone: "text-rose-600" },
];

const initialServices: Service[] = [
  {
    name: "Electrician",
    category: "MAIN MAINTENANCE",
    workers: 142,
    jobs: 38,
    ...serviceTones[0],
  },
  {
    name: "Plumber",
    category: "MAIN MAINTENANCE",
    workers: 98,
    jobs: 12,
    ...serviceTones[1],
  },
  {
    name: "Carpenter",
    category: "FURNITURE & WOOD",
    workers: 64,
    jobs: 21,
    ...serviceTones[2],
  },
  {
    name: "Painter",
    category: "HOME RENOVATION",
    workers: 45,
    jobs: 7,
    ...serviceTones[3],
  },
  {
    name: "House Keeping",
    category: "SANITATION",
    workers: 210,
    jobs: 89,
    ...serviceTones[4],
  },
];

function ServicesPage() {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newService, setNewService] = useState({
    name: "",
    category: "",
    workers: "",
    jobs: "",
  });
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const visibleServices = useMemo(() => {
    if (!normalizedSearch) return services;

    return services.filter((service) =>
      [service.name, service.category].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      ),
    );
  }, [normalizedSearch, services]);

  const distribution = services.map((service, index) => ({
    name: service.name.slice(0, 6),
    v: service.workers,
    color:
      [
        "hsl(217, 91%, 60%)",
        "hsl(189, 85%, 50%)",
        "hsl(38, 92%, 55%)",
        "hsl(160, 70%, 45%)",
        "hsl(346, 80%, 55%)",
        "hsl(262, 70%, 60%)",
      ][index % 6] ?? "hsl(220, 15%, 70%)",
  }));

  const handleAddService = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = newService.name.trim();
    const category = newService.category.trim().toUpperCase();
    const workers = Number(newService.workers);
    const jobs = Number(newService.jobs);

    if (!name || !category || !Number.isFinite(workers) || !Number.isFinite(jobs)) {
      toast.error("Complete the service form", {
        description: "Name, category, workers, and active jobs are required.",
      });
      return;
    }

    const tone = serviceTones[services.length % serviceTones.length];
    setServices((current) => [
      ...current,
      {
        name,
        category,
        workers: Math.max(0, workers),
        jobs: Math.max(0, jobs),
        ...tone,
      },
    ]);
    setIsDialogOpen(false);
    setNewService({ name: "", category: "", workers: "", jobs: "" });
    toast.success("Service added", {
      description: `${name} is now visible in Services Management.`,
    });
  };

  return (
    <div className="min-h-screen flex bg-surface-muted">
      <AdminSidebar active="Services" />
      <div className="flex-1 min-w-0 flex flex-col">
        <AdminTopbar>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search services..."
              className="w-full bg-surface-muted border border-border rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
        </AdminTopbar>

        <main className="flex-1 px-6 lg:px-10 py-8 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Admin Portal <span className="text-brand font-semibold">&gt; Services</span>
              </p>
              <h1 className="text-3xl font-bold tracking-tight mt-1">Services Management</h1>
              <p className="text-muted-foreground mt-1">
                Overview of available vocational services and their current workload across
                Pakistan.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsDialogOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-brand to-brand-light text-brand-foreground text-sm font-semibold shadow-lg"
            >
              <Plus className="size-4" /> Add New Service
            </button>
          </div>

          {searchTerm && (
            <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground">
              Showing {visibleServices.length} service
              {visibleServices.length === 1 ? "" : "s"} for "{searchTerm}".
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {visibleServices.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.name}
                  className="bg-background rounded-2xl p-5 border border-border hover:shadow-md transition-shadow"
                >
                  <div
                    className={`size-12 rounded-full flex items-center justify-center ${service.tone}`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 font-bold text-lg">{service.name}</h3>
                  <p className="text-[10px] tracking-widest font-semibold text-muted-foreground mt-1">
                    {service.category}
                  </p>
                  <div className="mt-5 flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold">{service.workers}</p>
                      <p className="text-[10px] tracking-widest font-semibold text-muted-foreground">
                        WORKERS
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${service.jobsTone}`}>
                        {String(service.jobs).padStart(2, "0")}
                      </p>
                      <p className="text-[10px] tracking-widest font-semibold text-muted-foreground">
                        ACTIVE JOBS
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {visibleServices.length === 0 && (
              <div className="col-span-full rounded-2xl border border-border bg-background p-8 text-center text-sm text-muted-foreground">
                No services match this search.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-background rounded-2xl p-6 border border-border">
              <h3 className="text-lg font-bold">Worker Distribution Trends</h3>
              <p className="text-sm text-muted-foreground">
                Active worker count across service categories
              </p>
              <div className="h-64 mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distribution}>
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Bar dataKey="v" radius={[12, 12, 12, 12]}>
                      {distribution.map((bar, index) => (
                        <Cell key={index} fill={bar.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-background rounded-2xl p-6 border border-border space-y-5">
              <div>
                <h3 className="text-lg font-bold">Market Status</h3>
                <p className="text-sm text-muted-foreground">Live demand & revenue</p>
              </div>

              <div className="rounded-2xl bg-emerald-500/10 px-4 py-3">
                <p className="text-sm font-semibold text-emerald-700">High Demand Period</p>
                <p className="text-xs text-emerald-700/80 mt-0.5">
                  Sanitation services trending up
                </p>
              </div>

              <div className="rounded-2xl border border-border p-5">
                <p className="text-3xl font-bold">Rs. 2.4M</p>
                <p className="text-[10px] tracking-widest font-semibold text-muted-foreground mt-1">
                  MONTHLY SERVICE REVENUE
                </p>
                <p className="text-sm font-semibold text-emerald-600 mt-3">
                  Up 12.5% vs Last Month
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add New Service</DialogTitle>
            <DialogDescription>Create a service category for the admin portal.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddService} className="space-y-4">
            <input
              value={newService.name}
              onChange={(event) =>
                setNewService((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Service name"
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:border-brand"
            />
            <input
              value={newService.category}
              onChange={(event) =>
                setNewService((current) => ({ ...current, category: event.target.value }))
              }
              placeholder="Category"
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:border-brand"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={newService.workers}
                onChange={(event) =>
                  setNewService((current) => ({ ...current, workers: event.target.value }))
                }
                type="number"
                min="0"
                placeholder="Workers"
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:border-brand"
              />
              <input
                value={newService.jobs}
                onChange={(event) =>
                  setNewService((current) => ({ ...current, jobs: event.target.value }))
                }
                type="number"
                min="0"
                placeholder="Active jobs"
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:border-brand"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="h-10 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-surface-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground hover:bg-brand-light"
              >
                Add Service
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { apiFetch } from "@/utils/api";

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

type BackendService = {
  _id: string;
  id?: number;
  name?: string;
  category_type?: string;
  description?: string;
};

type BackendWorker = {
  service_id?: string;
};

type BackendJob = {
  service_id?: string;
  status?: string;
};

type Service = {
  mongoId: string;
  id: string;
  name: string;
  category: string;
  description: string;
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

const chartColors = [
  "hsl(217, 91%, 60%)",
  "hsl(189, 85%, 50%)",
  "hsl(38, 92%, 55%)",
  "hsl(160, 70%, 45%)",
  "hsl(346, 80%, 55%)",
  "hsl(262, 70%, 60%)",
];

const activeJobStatuses = new Set(["pending", "assigned", "in_progress"]);

function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newService, setNewService] = useState({
    name: "",
    category: "",
    description: "",
  });
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const mapServices = (
    backendServices: BackendService[],
    backendWorkers: BackendWorker[],
    backendJobs: BackendJob[],
  ) => {
    return backendServices.map((service, index) => {
      const tone = serviceTones[index % serviceTones.length];
      const workerCount = backendWorkers.filter((worker) => worker.service_id === service._id).length;
      const activeJobs = backendJobs.filter(
        (job) => job.service_id === service._id && activeJobStatuses.has(job.status || "pending"),
      ).length;

      return {
        mongoId: service._id,
        id: service.id ? String(service.id) : service._id,
        name: service.name || "Unnamed Service",
        category: (service.category_type || "General").toUpperCase(),
        description: service.description || "No description provided.",
        workers: workerCount,
        jobs: activeJobs,
        ...tone,
      };
    });
  };

  const loadServices = async () => {
    setLoading(true);

    try {
      const [serviceResponse, workerResponse, jobResponse] = await Promise.all([
        apiFetch("/services"),
        apiFetch("/workers"),
        apiFetch("/jobs"),
      ]);

      if (!serviceResponse.ok || !workerResponse.ok || !jobResponse.ok) {
        throw new Error("Could not load service records from backend");
      }

      const [backendServices, backendWorkers, backendJobs] = (await Promise.all([
        serviceResponse.json(),
        workerResponse.json(),
        jobResponse.json(),
      ])) as [BackendService[], BackendWorker[], BackendJob[]];

      setServices(mapServices(backendServices, backendWorkers, backendJobs));
    } catch (error) {
      toast.error("Services could not be loaded", {
        description: error instanceof Error ? error.message : "Please check the backend server.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const visibleServices = useMemo(() => {
    if (!normalizedSearch) return services;

    return services.filter((service) =>
      [service.name, service.category, service.description].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      ),
    );
  }, [normalizedSearch, services]);

  const distribution = services.map((service, index) => ({
    name: service.name.slice(0, 8),
    v: service.workers,
    color: chartColors[index % chartColors.length] ?? "hsl(220, 15%, 70%)",
  }));

  const totalWorkers = services.reduce((sum, service) => sum + service.workers, 0);
  const totalActiveJobs = services.reduce((sum, service) => sum + service.jobs, 0);
  const busiestService = services.reduce<Service | null>(
    (current, service) => (!current || service.jobs > current.jobs ? service : current),
    null,
  );

  const handleAddService = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = newService.name.trim();
    const category = newService.category.trim();
    const description = newService.description.trim();

    if (!name || !category || !description) {
      toast.error("Complete the service form", {
        description: "Name, category, and description are required.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await apiFetch("/services", {
        method: "POST",
        body: JSON.stringify({
          name,
          category_type: category,
          description,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Service was not saved");
      }

      await loadServices();
      setIsDialogOpen(false);
      setNewService({ name: "", category: "", description: "" });
      toast.success("Service added", {
        description: `${name} has been saved in MongoDB.`,
      });
    } catch (error) {
      toast.error("Service was not added", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
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
                Services are now loaded from MongoDB, with worker and active job counts calculated
                from backend records.
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="rounded-2xl border border-border bg-background p-5">
              <p className="text-[10px] font-bold tracking-widest text-muted-foreground">
                TOTAL SERVICES
              </p>
              <p className="mt-2 text-3xl font-bold">{services.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-5">
              <p className="text-[10px] font-bold tracking-widest text-muted-foreground">
                LINKED WORKERS
              </p>
              <p className="mt-2 text-3xl font-bold">{totalWorkers}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-5">
              <p className="text-[10px] font-bold tracking-widest text-muted-foreground">
                ACTIVE JOBS
              </p>
              <p className="mt-2 text-3xl font-bold text-brand">{totalActiveJobs}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {loading && (
              <div className="col-span-full rounded-2xl border border-border bg-background p-8 text-center text-sm text-muted-foreground">
                Loading services from backend...
              </div>
            )}

            {!loading &&
              visibleServices.map((service) => {
                const Icon = service.icon;
                return (
                  <div
                    key={service.mongoId}
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
                    <p className="mt-3 min-h-10 text-xs leading-5 text-muted-foreground">
                      {service.description}
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

            {!loading && visibleServices.length === 0 && (
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
                <p className="text-sm text-muted-foreground">Live demand from backend jobs</p>
              </div>

              <div className="rounded-2xl bg-emerald-500/10 px-4 py-3">
                <p className="text-sm font-semibold text-emerald-700">
                  {busiestService ? `${busiestService.name} has the highest live demand` : "No demand yet"}
                </p>
                <p className="text-xs text-emerald-700/80 mt-0.5">
                  Based on pending, assigned, and in-progress jobs.
                </p>
              </div>

              <div className="rounded-2xl border border-border p-5">
                <p className="text-3xl font-bold">{totalActiveJobs}</p>
                <p className="text-[10px] tracking-widest font-semibold text-muted-foreground mt-1">
                  OPEN SERVICE REQUESTS
                </p>
                <p className="text-sm font-semibold text-brand mt-3">
                  {totalWorkers} workers linked to service categories
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
            <DialogDescription>Create a service category and save it to MongoDB.</DialogDescription>
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
            <textarea
              value={newService.description}
              onChange={(event) =>
                setNewService((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Description"
              className="min-h-24 w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm focus:outline-none focus:border-brand"
            />
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
                disabled={isSaving}
                className="h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Add Service"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

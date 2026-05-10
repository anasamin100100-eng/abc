import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Plus,
  Minus,
  Crosshair,
  ExternalLink,
  Search,
  Filter,
  Phone,
  Zap,
  Wrench,
  Snowflake,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const Route = createFileRoute("/active-jobs")({
  component: ActiveJobsPage,
  head: () => ({
    meta: [
      { title: "Active Jobs - UstadGo Admin" },
      {
        name: "description",
        content:
          "Live status of UstadGo service requests across the region with worker locations, ETA countdowns, and job statuses.",
      },
    ],
  }),
});

type JobStatus = "WORKER ON WAY" | "IN PROGRESS" | "assigned" | "in_progress" | "pending" | "completed" | "cancelled";
type StatusFilter = "All Statuses" | JobStatus;

interface Job {
  id: string;
  service: string;
  icon: typeof Zap;
  area: string;
  worker: string;
  initials: string;
  lat: string;
  lng: string;
  eta: string;
  status: JobStatus;
}

type BackendJob = {
  id?: string;
  service?: string;
  area?: string;
  worker?: string;
  initials?: string;
  lat?: string;
  lng?: string;
  latitude?: string;
  longitude?: string;
  eta?: string;
  status?: JobStatus;
};

const pageSize = 3;
const totalBackendJobs = 10;
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const karachiCenter = {
  lat: 24.8607,
  lng: 67.0011,
};
const statusFilters: StatusFilter[] = ["All Statuses", "WORKER ON WAY", "IN PROGRESS"];

const getJobIcon = (service: string) => {
  const normalized = service.toLowerCase();
  if (normalized.includes("electric")) return Zap;
  if (normalized.includes("pipe") || normalized.includes("plumb")) return Wrench;
  return Snowflake;
};

function ActiveJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All Statuses");
  const [currentPage, setCurrentPage] = useState(1);
  const [mapZoom, setMapZoom] = useState(12);
  const [lastUpdated, setLastUpdated] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const loadJobs = () => {
    fetch("http://localhost:5000/api/jobs?limit=10")
      .then((res) => res.json())
      .then((data: BackendJob[]) => {
        const formatted = data.slice(0, totalBackendJobs).map((job) => ({
          id: job.id ?? "",
          service: job.service ?? "Service",
          icon: getJobIcon(job.service ?? ""),
          area: job.area ?? "Karachi",
          worker: job.worker ?? "Unassigned",
          initials: job.initials ?? "NA",
          lat: job.latitude ?? job.lat ?? String(karachiCenter.lat),
          lng: job.longitude ?? job.lng ?? String(karachiCenter.lng),
          eta: job.eta ?? "Pending",
          status: job.status === "assigned" ? "WORKER ON WAY" : job.status === "in_progress" ? "IN PROGRESS" : job.status ?? "WORKER ON WAY",
        }));

        setJobs(formatted);
        setLastUpdated(
          new Date().toLocaleTimeString("en-PK", {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          }),
        );
      })
      .catch(() => {
        toast.error("Unable to load active jobs", {
          description: "Check that the backend is running on localhost:5000.",
        });
      });
  };

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = window.setInterval(loadJobs, 30000);
    return () => window.clearInterval(intervalId);
  }, [autoRefresh]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesStatus = statusFilter === "All Statuses" || job.status === statusFilter;
      const matchesSearch =
        !normalizedSearch ||
        [job.id, job.service, job.area, job.worker, job.initials, job.status].some((value) =>
          value.toLowerCase().includes(normalizedSearch),
        );

      return matchesStatus && matchesSearch;
    });
  }, [jobs, normalizedSearch, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * pageSize;
  const pageJobs = filteredJobs.slice(pageStart, pageStart + pageSize);
  const mapJobs = jobs
    .map((job) => ({
      ...job,
      latNumber: Number(job.lat),
      lngNumber: Number(job.lng),
    }))
    .filter((job) => Number.isFinite(job.latNumber) && Number.isFinite(job.lngNumber));
  const mapOrigin = mapJobs[0]
    ? `${mapJobs[0].latNumber},${mapJobs[0].lngNumber}`
    : `${karachiCenter.lat},${karachiCenter.lng}`;
  const mapDestination = mapJobs[mapJobs.length - 1]
    ? `${mapJobs[mapJobs.length - 1].latNumber},${mapJobs[mapJobs.length - 1].lngNumber}`
    : `${karachiCenter.lat},${karachiCenter.lng}`;
  const mapWaypoints = mapJobs
    .slice(1, -1)
    .map((job) => `${job.latNumber},${job.lngNumber}`)
    .join("|");
  const mapUrl = googleMapsApiKey
    ? `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(
        googleMapsApiKey,
      )}&origin=${encodeURIComponent(mapOrigin)}&destination=${encodeURIComponent(
        mapDestination,
      )}${mapWaypoints ? `&waypoints=${encodeURIComponent(mapWaypoints)}` : ""}&zoom=${mapZoom}&mode=driving`
    : "";
  const openMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    mapOrigin,
  )}&destination=${encodeURIComponent(mapDestination)}${
    mapWaypoints ? `&waypoints=${encodeURIComponent(mapWaypoints)}` : ""
  }&travelmode=driving`;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="flex min-h-screen bg-surface-muted">
      <AdminSidebar active="Active Jobs" />
      <div className="flex-1 flex flex-col">
        <AdminTopbar>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Active Jobs</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </span>
            <div className="ml-6 hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-card border border-border">
              <span className="text-sm font-medium text-foreground">Auto-Refresh (30s)</span>
              <button
                type="button"
                onClick={() => setAutoRefresh((current) => !current)}
                aria-pressed={autoRefresh}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  autoRefresh ? "bg-brand" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white transition-transform ${
                    autoRefresh ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </AdminTopbar>

        <main className="flex-1 px-6 lg:px-10 py-6 space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-4">
            <div className="relative rounded-2xl overflow-hidden border border-border h-[420px] bg-slate-100">
              {mapUrl ? (
                <iframe
                  title="Active jobs Google map"
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
                      Add VITE_GOOGLE_MAPS_API_KEY to your frontend .env file and restart the dev
                      server.
                    </p>
                  </div>
                </div>
              )}

              <a
                href={openMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="absolute top-6 right-6 inline-flex h-10 items-center gap-2 rounded-xl bg-card px-4 text-sm font-semibold text-foreground shadow-md border border-border hover:bg-surface-muted"
              >
                <ExternalLink className="size-4" />
                Open in Maps
              </a>

              <div className="absolute bottom-6 right-6 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setMapZoom((zoom) => Math.min(18, zoom + 1))}
                  className="size-10 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-surface-muted transition-colors"
                >
                  <Plus className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setMapZoom((zoom) => Math.max(8, zoom - 1))}
                  className="size-10 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-surface-muted transition-colors"
                >
                  <Minus className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setMapZoom(12)}
                  className="size-10 rounded-lg bg-brand text-brand-foreground flex items-center justify-center"
                >
                  <Crosshair className="size-4" />
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-card px-6 py-5 border border-border shadow-sm">
              <p className="text-[11px] font-bold tracking-widest text-muted-foreground">
                LIVE FLEET STATS
              </p>
              <div className="mt-5 grid grid-cols-2 xl:grid-cols-1 gap-4">
                <div className="rounded-xl bg-surface-muted/60 p-4">
                  <p className="text-3xl font-bold text-brand">124</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Active Ustads</p>
                </div>
                <div className="rounded-xl bg-surface-muted/60 p-4">
                  <p className="text-3xl font-bold text-orange-500">{jobs.length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Backend Jobs</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Currently Active Jobs</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Real-time status of service requests across the region.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search Worker or ID..."
                    className="pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm w-64"
                  />
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-surface-muted transition-colors">
                      <Filter className="size-4" />
                      {statusFilter === "All Statuses" ? "Filter" : statusFilter}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56 rounded-xl p-2">
                    {statusFilters.map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setStatusFilter(filter)}
                        className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                          statusFilter === filter
                            ? "bg-brand text-brand-foreground"
                            : "text-foreground/80 hover:bg-surface-muted"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      "JOB ID",
                      "SERVICE",
                      "CLIENT AREA",
                      "WORKER NAME",
                      "LIVE LOCATION",
                      "ETA COUNTDOWN",
                      "STATUS",
                      "ACTION",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-3 py-4 text-[11px] font-bold tracking-wider text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageJobs.map((j, idx) => {
                    const Icon = j.icon;
                    return (
                      <tr
                        key={j.id}
                        className={`border-b border-border last:border-0 ${
                          idx === 0 ? "bg-orange-50/50" : ""
                        }`}
                      >
                        <td className="px-3 py-5">
                          <div className="flex items-center gap-3">
                            {idx === 0 && <span className="w-1 h-10 rounded bg-orange-500" />}
                            <span className="text-sm font-bold text-brand">{j.id}</span>
                          </div>
                        </td>
                        <td className="px-3 py-5">
                          <div className="flex items-center gap-2">
                            <Icon className="size-4 text-orange-500" />
                            <span className="text-sm text-foreground">{j.service}</span>
                          </div>
                        </td>
                        <td className="px-3 py-5 text-sm text-foreground/80">{j.area}</td>
                        <td className="px-3 py-5">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-xs">
                              {j.initials}
                            </div>
                            <span className="text-sm font-semibold text-foreground">
                              {j.worker}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-5 text-xs text-foreground/70">
                          <p>{j.lat},</p>
                          <p>{j.lng}</p>
                        </td>
                        <td className="px-3 py-5">
                          <span
                            className={`text-sm font-bold ${
                              j.eta === "Arrived" ? "text-foreground italic" : "text-orange-500"
                            }`}
                          >
                            {j.eta}
                          </span>
                        </td>
                        <td className="px-3 py-5">
                          <span
                            className={`inline-flex px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide ${
                              j.status === "IN PROGRESS"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {j.status}
                          </span>
                        </td>
                        <td className="px-3 py-5">
                          <a
                            href={`tel:+923001234567`}
                            className="size-9 rounded-full bg-brand/10 hover:bg-brand/20 flex items-center justify-center text-brand transition-colors"
                          >
                            <Phone className="size-4" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                  {pageJobs.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                        No active jobs match this search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <p className="text-[11px] font-bold tracking-widest text-muted-foreground">
                LAST UPDATED AT {lastUpdated || "LOADING"}
              </p>
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  Showing {pageJobs.length} of {jobs.length || totalBackendJobs} active jobs
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage === 1}
                  className="size-9 rounded-lg border border-border flex items-center justify-center hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button className="size-9 rounded-lg bg-brand text-brand-foreground font-semibold text-sm">
                  {safeCurrentPage}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="size-9 rounded-lg border border-border flex items-center justify-center hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

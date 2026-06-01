import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, MapPin, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { apiFetch } from "@/utils/api";

export const Route = createFileRoute("/all-jobs")({
  component: AllJobsPage,
  head: () => ({ meta: [{ title: "All Jobs - UstadGo Admin" }] }),
});

type Job = {
  _id: string;
  id?: string;
  service_id?: string;
  client_id?: string;
  worker_id?: string;
  location?: string;
  status?: string;
  offer_status?: string;
  suggested_price?: number;
  requested_at?: string;
};
type User = { _id: string; name?: string };
type Service = { _id: string; name?: string };

function AllJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  useEffect(() => {
    async function loadJobs() {
      setLoading(true);
      try {
        const [jobResponse, userResponse, serviceResponse] = await Promise.all([
          apiFetch("/jobs"),
          apiFetch("/users"),
          apiFetch("/services"),
        ]);
        if (!jobResponse.ok || !userResponse.ok || !serviceResponse.ok) {
          throw new Error("Could not load jobs from backend");
        }
        setJobs((await jobResponse.json()) as Job[]);
        setUsers((await userResponse.json()) as User[]);
        setServices((await serviceResponse.json()) as Service[]);
      } catch (error) {
        toast.error("Jobs could not be loaded", {
          description: error instanceof Error ? error.message : "Please check backend/login.",
        });
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, []);

  const usersById = useMemo(() => new Map(users.map((user) => [user._id, user])), [users]);
  const servicesById = useMemo(
    () => new Map(services.map((service) => [service._id, service])),
    [services],
  );
  const statuses = ["all", ...Array.from(new Set(jobs.map((job) => job.status || "pending")))];

  const visibleJobs = jobs.filter((job) => {
    const client = usersById.get(job.client_id || "")?.name || "";
    const worker = usersById.get(job.worker_id || "")?.name || "";
    const service = servicesById.get(job.service_id || "")?.name || "";
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    const matchesSearch =
      !normalizedSearch ||
      [job.id, client, worker, service, job.location, job.status, job.offer_status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-surface-muted flex">
      <AdminSidebar active="All Jobs" />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search all jobs..."
              className="w-full bg-surface-muted border border-border rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
        </AdminTopbar>
        <main className="flex-1 px-6 lg:px-10 py-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <Briefcase className="size-6" />
              </div>
              <h1 className="mt-4 text-3xl font-bold">All Jobs</h1>
              <p className="text-muted-foreground mt-1">Complete job history from MongoDB.</p>
            </div>
            <Link
              to="/job-requests"
              className="rounded-xl bg-brand px-4 py-3 text-sm font-bold text-brand-foreground"
            >
              Manage Job Requests
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            {statuses.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${
                  statusFilter === status
                    ? "bg-brand text-brand-foreground"
                    : "bg-background border border-border"
                }`}
              >
                {status.replace("_", " ")}
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-border bg-background overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-4 text-left">Job</th>
                    <th className="px-4 py-4 text-left">Client / Worker</th>
                    <th className="px-4 py-4 text-left">Service</th>
                    <th className="px-4 py-4 text-left">Location</th>
                    <th className="px-4 py-4 text-left">Budget</th>
                    <th className="px-5 py-4 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                        Loading jobs from backend...
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    visibleJobs.map((job) => (
                      <tr key={job._id} className="border-t border-border">
                        <td className="px-5 py-4 font-bold">{job.id || job._id}</td>
                        <td className="px-4 py-4">
                          <p className="font-semibold">
                            {usersById.get(job.client_id || "")?.name || "Unknown client"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Worker: {usersById.get(job.worker_id || "")?.name || "Unassigned"}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          {servicesById.get(job.service_id || "")?.name || "General Service"}
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-2">
                            <MapPin className="size-4 text-muted-foreground" />
                            {job.location || "Not provided"}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-bold">
                          {job.suggested_price ? `Rs. ${job.suggested_price.toLocaleString()}` : "Not set"}
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-full bg-brand/10 px-3 py-1 text-[11px] font-bold uppercase text-brand">
                            {(job.status || "pending").replace("_", " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  {!loading && visibleJobs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                        No jobs match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

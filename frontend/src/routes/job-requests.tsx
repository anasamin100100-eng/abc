import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  MapPin,
  Search,
  UserCheck,
  Play,
  Tag,
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch } from "@/utils/api";

export const Route = createFileRoute("/job-requests")({
  component: JobRequestsPage,
  head: () => ({
    meta: [
      { title: "Job Requests - UstadGo Admin" },
      {
        name: "description",
        content: "Monitor UstadGo service requests, assigned workers, offer status, and job state.",
      },
    ],
  }),
});

type JobStatus = "pending" | "assigned" | "in_progress" | "completed" | "cancelled";
type StatusFilter = "All Jobs" | "Pending" | "Assigned" | "In Progress" | "Completed" | "Cancelled";

type BackendJob = {
  _id: string;
  id?: string;
  client_id?: string;
  worker_id?: string;
  service_id?: string;
  description?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  suggested_price?: number;
  status?: JobStatus;
  offer_status?: string;
  requested_at?: string;
  completed_at?: string | null;
  video_url?: string;
};

type BackendUser = {
  _id: string;
  name?: string;
  email?: string;
};

type BackendService = {
  _id: string;
  name?: string;
  category_type?: string;
};

type EtaPrediction = {
  eta_label?: string;
  eta_minutes?: number;
  estimated_minutes?: number;
  distance_km?: number;
  confidence?: number;
};

const KARACHI_CENTER = { latitude: 24.8607, longitude: 67.0011 };

function mockWorkerLocation(jobId: string, jobLat: number, jobLng: number) {
  let hash = 0;

  for (let index = 0; index < jobId.length; index += 1) {
    hash = (hash * 31 + jobId.charCodeAt(index)) % 100000;
  }

  return {
    latitude: jobLat + 0.018 + (hash % 18) / 1000,
    longitude: jobLng - (0.018 + ((hash >> 3) % 18) / 1000),
  };
}

async function fetchJobEta(job: BackendJob): Promise<EtaPrediction | null> {
  const jobLocation = {
    latitude: job.latitude ?? KARACHI_CENTER.latitude,
    longitude: job.longitude ?? KARACHI_CENTER.longitude,
  };
  const workerLocation = mockWorkerLocation(job._id, jobLocation.latitude, jobLocation.longitude);

  try {
    const etaResponse = await apiFetch("/eta", {
      method: "POST",
      body: JSON.stringify({ jobLocation, workerLocation }),
    });

    if (!etaResponse.ok) return null;
    return (await etaResponse.json()) as EtaPrediction;
  } catch {
    return null;
  }
}

type JobRequest = {
  mongoId: string;
  id: string;
  client: string;
  worker: string;
  service: string;
  description: string;
  location: string;
  price: string;
  status: JobStatus;
  offerStatus: string;
  requestedAt: string;
  etaLabel: string;
  etaMeta: string;
  videoUrl?: string;
};

const pageSize = 8;
const filters: StatusFilter[] = [
  "All Jobs",
  "Pending",
  "Assigned",
  "In Progress",
  "Completed",
  "Cancelled",
];

const statusLabels: Record<JobStatus, StatusFilter> = {
  pending: "Pending",
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const statusClasses: Record<JobStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-cyan-100 text-cyan-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

const formatCurrency = (value?: number) =>
  typeof value === "number" && Number.isFinite(value) ? `Rs. ${value.toLocaleString()}` : "Not set";

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleString("en-PK", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not available";

type BackendOffer = {
  _id: string;
  job_id: string;
  worker_id: string;
  offered_price: number;
  message?: string;
  status: "pending" | "accepted" | "rejected";
  offered_at?: string;
};

function JobRequestsPage() {
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("All Jobs");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  
  // New States for Indriver Bidding and Video Player
  const [selectedJobForVideo, setSelectedJobForVideo] = useState<JobRequest | null>(null);
  const [selectedJobForBids, setSelectedJobForBids] = useState<JobRequest | null>(null);
  const [allOffers, setAllOffers] = useState<BackendOffer[]>([]);
  const [backendUsers, setBackendUsers] = useState<BackendUser[]>([]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const loadJobs = async () => {
    setLoading(true);

    try {
      const [jobResponse, userResponse, serviceResponse, offerResponse] = await Promise.all([
        apiFetch("/jobs"),
        apiFetch("/users"),
        apiFetch("/services"),
        apiFetch("/price-offers"),
      ]);

      if (!jobResponse.ok || !userResponse.ok || !serviceResponse.ok || !offerResponse.ok) {
        throw new Error("Could not load job requests from backend");
      }

      const [bJobs, bUsers, bServices, bOffers] = (await Promise.all([
        jobResponse.json(),
        userResponse.json(),
        serviceResponse.json(),
        offerResponse.json(),
      ])) as [BackendJob[], BackendUser[], BackendService[], BackendOffer[]];
      
      setBackendUsers(bUsers);
      setAllOffers(bOffers);

      const etaResults = await Promise.all(bJobs.map((job) => fetchJobEta(job)));
      const usersById = new Map(bUsers.map((user) => [user._id, user]));
      const servicesById = new Map(bServices.map((service) => [service._id, service]));

      setJobs(
        bJobs.map((job, index) => {
          const client = job.client_id ? usersById.get(job.client_id) : undefined;
          const worker = job.worker_id ? usersById.get(job.worker_id) : undefined;
          const service = job.service_id ? servicesById.get(job.service_id) : undefined;
          const eta = etaResults[index];
          const fallbackLocation =
            job.latitude && job.longitude
              ? `${job.latitude.toFixed(4)}, ${job.longitude.toFixed(4)}`
              : "Location not provided";

          return {
            mongoId: job._id,
            id: job.id || `#JOB-${String(index + 1).padStart(4, "0")}`,
            client: client?.name || "Unassigned client",
            worker: worker?.name || "Unassigned worker",
            service: service?.name || "General Service",
            description: job.description || "No job description provided.",
            location: job.location || fallbackLocation,
            price: formatCurrency(job.suggested_price),
            status: job.status || "pending",
            offerStatus: (job.offer_status || "pending").replaceAll("_", " ").toUpperCase(),
            requestedAt: formatDate(job.requested_at),
            etaLabel:
              eta?.eta_label ||
              (eta?.eta_minutes ?? eta?.estimated_minutes
                ? `${eta.eta_minutes ?? eta.estimated_minutes} mins`
                : "Pending"),
            etaMeta: eta
              ? `${eta.distance_km ?? 0} km · ~${eta.eta_minutes ?? eta.estimated_minutes ?? "—"} min`
              : "Waiting for location",
            videoUrl: job.video_url,
          };
        }),
      );
    } catch (error) {
      toast.error("Job requests could not be loaded", {
        description: error instanceof Error ? error.message : "Please check the backend server.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesFilter = activeFilter === "All Jobs" || statusLabels[job.status] === activeFilter;
      const matchesSearch =
        !normalizedSearch ||
        [
          job.id,
          job.client,
          job.worker,
          job.service,
          job.description,
          job.location,
          job.etaLabel,
          job.offerStatus,
          statusLabels[job.status],
        ].some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, jobs, normalizedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * pageSize;
  const pageJobs = filteredJobs.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const updateJobStatus = async (job: JobRequest, status: JobStatus) => {
    setUpdatingJobId(job.mongoId);

    try {
      const response = await apiFetch(`/jobs/${job.mongoId}`, {
        method: "PUT",
        body: JSON.stringify({
          status,
          completed_at: status === "completed" ? new Date().toISOString() : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Job status update failed");
      }

      setJobs((current) =>
        current.map((item) => (item.mongoId === job.mongoId ? { ...item, status } : item)),
      );

      toast.success("Job status updated", {
        description: `${job.id} is now ${statusLabels[status].toLowerCase()}.`,
      });
    } catch (error) {
      toast.error("Job was not updated", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setUpdatingJobId(null);
    }
  };

  const statusCounts = filters.slice(1).map((filter) => ({
    label: filter,
    count: jobs.filter((job) => statusLabels[job.status] === filter).length,
  }));

  return (
    <div className="min-h-screen bg-surface-muted flex">
      <AdminSidebar active="Job Requests" />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              to="/dashboard"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Admin Portal
            </Link>
            <ChevronRight className="size-4 text-muted-foreground" />
            <span className="font-semibold text-brand">Job Requests</span>
          </nav>
        </AdminTopbar>

        <main className="flex-1 px-6 lg:px-10 py-8 space-y-6">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
            <div>
              <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <ClipboardList className="size-6" />
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
                Job Requests
              </h1>
              <p className="mt-1 text-muted-foreground">
                Monitor service requests, assigned workers, offer status, and completion progress.
              </p>
            </div>

            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search jobs, clients, workers or locations..."
                className="w-full h-12 pl-11 pr-4 rounded-2xl bg-background border border-border text-sm focus:outline-none focus:border-brand transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {statusCounts.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setActiveFilter(item.label)}
                className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                  activeFilter === item.label
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border bg-background text-foreground hover:bg-surface-muted"
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest">{item.label}</p>
                <p className="mt-2 text-2xl font-bold">{item.count}</p>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-border bg-background p-1">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  activeFilter === filter
                    ? "bg-brand text-brand-foreground"
                    : "text-foreground/70 hover:text-foreground hover:bg-surface-muted"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="bg-background rounded-3xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-4 text-left font-semibold">Job</th>
                    <th className="px-4 py-4 text-left font-semibold">Client / Worker</th>
                    <th className="px-4 py-4 text-left font-semibold">Service</th>
                    <th className="px-4 py-4 text-left font-semibold">Location</th>
                    <th className="px-4 py-4 text-left font-semibold">ETA</th>
                    <th className="px-4 py-4 text-left font-semibold">Price</th>
                    <th className="px-4 py-4 text-left font-semibold">Offer</th>
                    <th className="px-4 py-4 text-left font-semibold">Status</th>
                    <th className="px-5 py-4 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={9} className="px-6 py-10 text-center text-muted-foreground">
                        Loading job requests from backend...
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    pageJobs.map((job) => (
                      <tr
                        key={job.mongoId}
                        className="border-t border-border hover:bg-surface-muted/40 transition-colors"
                      >
                        <td className="px-5 py-5 min-w-72">
                          <p className="font-bold text-foreground">{job.id}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {job.description}
                          </p>
                          <p className="mt-2 text-[11px] font-semibold text-foreground/60">
                            {job.requestedAt}
                          </p>
                        </td>
                        <td className="px-4 py-5 min-w-48">
                          <div className="flex items-start gap-2">
                            <UserCheck className="mt-0.5 size-4 text-brand" />
                            <div>
                              <p className="font-semibold text-foreground">{job.client}</p>
                              <p className="text-xs text-muted-foreground">Worker: {job.worker}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <span className="inline-flex rounded-full bg-brand/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-brand">
                            {job.service}
                          </span>
                        </td>
                        <td className="px-4 py-5 min-w-48">
                          <div className="flex items-start gap-2 text-foreground/80">
                            <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                            <span>{job.location}</span>
                          </div>
                        </td>
                        <td className="px-4 py-5 min-w-36">
                          <div className="flex items-start gap-2">
                            <Clock3 className="mt-0.5 size-4 text-orange-500" />
                            <div>
                              <p className="font-bold text-foreground">{job.etaLabel}</p>
                              <p className="text-xs text-muted-foreground">{job.etaMeta}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5 font-bold text-foreground">{job.price}</td>
                        <td className="px-4 py-5 text-xs font-bold text-foreground/70">
                          {job.offerStatus}
                        </td>
                        <td className="px-4 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${statusClasses[job.status]}`}
                          >
                            {statusLabels[job.status]}
                          </span>
                        </td>
                        <td className="px-5 py-5">
                          <div className="flex flex-wrap gap-2 min-w-64">
                            {job.videoUrl && (
                              <button
                                type="button"
                                onClick={() => setSelectedJobForVideo(job)}
                                className="flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-bold bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                                title="Play Job Video Description"
                              >
                                <Play className="size-3.5 fill-orange-600" /> Watch Video
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedJobForBids(job)}
                              className="flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-bold bg-brand/10 text-brand hover:bg-brand/20 transition-colors"
                              title="View Bids / Offers"
                            >
                              <Tag className="size-3.5" /> Bids ({allOffers.filter((o) => o.job_id === job.mongoId).length})
                            </button>
                            <StatusButton
                              label="Assign"
                              disabled={job.status === "assigned" || updatingJobId === job.mongoId}
                              onClick={() => updateJobStatus(job, "assigned")}
                            />
                            <StatusButton
                              label="Start"
                              disabled={
                                job.status === "in_progress" || updatingJobId === job.mongoId
                              }
                              onClick={() => updateJobStatus(job, "in_progress")}
                            />
                            <StatusButton
                              label="Complete"
                              disabled={job.status === "completed" || updatingJobId === job.mongoId}
                              onClick={() => updateJobStatus(job, "completed")}
                            />
                            <StatusButton
                              label="Cancel"
                              danger
                              disabled={job.status === "cancelled" || updatingJobId === job.mongoId}
                              onClick={() => updateJobStatus(job, "cancelled")}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}

                  {!loading && pageJobs.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-6 py-10 text-center text-muted-foreground">
                        No job requests match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-5 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-bold text-foreground">
                  {filteredJobs.length === 0 ? 0 : pageStart + 1}-
                  {Math.min(pageStart + pageSize, filteredJobs.length)}
                </span>{" "}
                of <span className="font-bold text-foreground">{filteredJobs.length}</span> jobs
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage === 1}
                  className="size-9 rounded-lg flex items-center justify-center text-foreground/60 hover:bg-surface-muted transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {Array.from({ length: Math.min(3, totalPages) }, (_, index) => index + 1).map(
                  (page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`size-9 rounded-lg text-sm font-semibold transition-colors ${
                        safeCurrentPage === page
                          ? "bg-brand text-brand-foreground shadow-md"
                          : "text-foreground/70 hover:bg-surface-muted"
                      }`}
                    >
                      {page}
                    </button>
                  ),
                )}
                {totalPages > 3 && (
                  <>
                    <span className="px-2 text-muted-foreground">...</span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(totalPages)}
                      className={`size-9 rounded-lg text-sm font-semibold transition-colors ${
                        safeCurrentPage === totalPages
                          ? "bg-brand text-brand-foreground shadow-md"
                          : "text-foreground/70 hover:bg-surface-muted"
                      }`}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="size-9 rounded-lg flex items-center justify-center text-foreground/60 hover:bg-surface-muted transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Video Player Modal */}
      <Dialog open={!!selectedJobForVideo} onOpenChange={(open) => !open && setSelectedJobForVideo(null)}>
        <DialogContent className="rounded-2xl max-w-xl">
          <DialogHeader>
            <DialogTitle>Job Issue Video - {selectedJobForVideo?.id}</DialogTitle>
            <DialogDescription>
              Review the recorded video uploaded by {selectedJobForVideo?.client} describing the home issue.
            </DialogDescription>
          </DialogHeader>
          {selectedJobForVideo?.videoUrl ? (
            <div className="rounded-2xl overflow-hidden bg-black border border-border aspect-video mt-4 shadow-inner">
              <video
                src={selectedJobForVideo.videoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground mt-4">
              No video was recorded for this service request.
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Bids and Price Offers (Indriver Model) Modal */}
      <Dialog open={!!selectedJobForBids} onOpenChange={(open) => !open && setSelectedJobForBids(null)}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ustad Price Offers (Bids) - {selectedJobForBids?.id}</DialogTitle>
            <DialogDescription>
              Manage custom price bids submitted by local home workers (Ustads) for this request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {(() => {
              const jobOffers = allOffers.filter((o) => o.job_id === selectedJobForBids?.mongoId);
              if (jobOffers.length === 0) {
                return (
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    No bids have been submitted by Ustads for this job request yet.
                  </div>
                );
              }
              return jobOffers.map((offer) => {
                const workerUser = backendUsers.find((u) => u._id === offer.worker_id);
                return (
                  <div
                    key={offer._id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-surface-muted/30 p-5 hover:bg-surface-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-foreground">{workerUser?.name || "Ustad Ustad"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Bid message: "{offer.message || 'No description'}"</p>
                      <p className="text-[10px] font-semibold text-brand/80 mt-1 uppercase tracking-wider">
                        Status: {offer.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">Rs. {offer.offered_price.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Offered Price</p>
                      </div>
                      <button
                        type="button"
                        disabled={offer.status === "accepted" || updatingJobId !== null}
                        onClick={async () => {
                          try {
                            setUpdatingJobId(selectedJobForBids!.mongoId);
                            
                            // 1. Accept this specific offer
                            const offerRes = await apiFetch(`/price-offers/${offer._id}`, {
                              method: "PUT",
                              body: JSON.stringify({ status: "accepted", responded_at: new Date().toISOString() }),
                            });
                            if (!offerRes.ok) throw new Error("Could not accept bid");

                            // 2. Reject other offers for this job
                            const otherOffers = jobOffers.filter((o) => o._id !== offer._id);
                            await Promise.all(
                              otherOffers.map((o) =>
                                apiFetch(`/price-offers/${o._id}`, {
                                  method: "PUT",
                                  body: JSON.stringify({ status: "rejected", responded_at: new Date().toISOString() }),
                                })
                              )
                            );

                            // 3. Update the Job Request in the database with worker_id and agreed suggested_price
                            const jobRes = await apiFetch(`/jobs/${selectedJobForBids!.mongoId}`, {
                              method: "PUT",
                              body: JSON.stringify({
                                worker_id: offer.worker_id,
                                suggested_price: offer.offered_price,
                                offer_status: "accepted",
                                status: "assigned"
                              }),
                            });
                            if (!jobRes.ok) throw new Error("Could not assign worker to job");

                            toast.success("Price Offer Accepted", {
                              description: `${workerUser?.name || 'Ustad'} has been assigned with price Rs. ${offer.offered_price}.`,
                            });
                            
                            setSelectedJobForBids(null);
                            loadJobs();
                          } catch (error) {
                            toast.error("Bid action failed", {
                              description: error instanceof Error ? error.message : "Please try again.",
                            });
                          } finally {
                            setUpdatingJobId(null);
                          }
                        }}
                        className="h-10 rounded-xl bg-brand px-4 text-xs font-bold text-brand-foreground hover:bg-brand-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {offer.status === "accepted" ? "Accepted" : "Accept Bid"}
                      </button>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusButton({
  danger,
  disabled,
  label,
  onClick,
}: {
  danger?: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
          : "bg-surface-muted text-foreground hover:bg-brand/10 hover:text-brand"
      }`}
    >
      {label}
    </button>
  );
}

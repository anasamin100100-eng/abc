import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  Download,
  Star,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  ShieldCheck,
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { apiFetch } from "@/utils/api";

export const Route = createFileRoute("/workers")({
  component: WorkersPage,
  head: () => ({
    meta: [
      { title: "Workers - UstadGo Admin" },
      {
        name: "description",
        content:
          "Manage and verify UstadGo workers across Pakistan: search, filter and export worker records.",
      },
    ],
  }),
});

const tabs = ["All", "Pending Verification", "Verified", "Rejected"] as const;
const pageSize = 10;

type WorkerStatus = (typeof tabs)[number];

type BackendWorker = {
  _id: string;
  id?: number;
  user_id?: string;
  service_id?: string;
  cnic?: string;
  skills?: string;
  profile_picture?: string;
  verification_status?: "pending" | "approved" | "rejected";
  rating?: number;
  reliability_score?: number;
  total_jobs?: number;
};

type BackendUser = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
};

type BackendService = {
  _id: string;
  name?: string;
  category_type?: string;
};

type Worker = {
  mongoId: string;
  id: string;
  name: string;
  email: string;
  initials: string;
  initialsBg: string;
  service: string;
  serviceClass: string;
  city: string;
  cnic: string;
  skills: string;
  rating: number;
  totalJobs: number;
  reliability: number;
  status: WorkerStatus;
};

type VerificationResult = {
  confidence?: number;
  recommendation?: "approved" | "pending" | "rejected";
  notes?: string[];
};

const statusToTab = (status?: BackendWorker["verification_status"]): WorkerStatus => {
  if (status === "approved") return "Verified";
  if (status === "rejected") return "Rejected";
  return "Pending Verification";
};

const tabToBackendStatus = (status: Exclude<WorkerStatus, "All">) => {
  if (status === "Verified") return "approved";
  if (status === "Rejected") return "rejected";
  return "pending";
};

const makeInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "WK";

const serviceClasses = [
  "bg-brand/10 text-brand",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",
  "bg-cyan-100 text-cyan-700",
];

const cityFallbacks = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad"];

const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;

function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [activeTab, setActiveTab] = useState<WorkerStatus>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingWorkerId, setUpdatingWorkerId] = useState<string | null>(null);
  const [verifyingWorkerId, setVerifyingWorkerId] = useState<string | null>(null);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const loadWorkers = async () => {
    setLoading(true);

    try {
      const [workerResponse, userResponse, serviceResponse] = await Promise.all([
        apiFetch("/workers"),
        apiFetch("/users"),
        apiFetch("/services"),
      ]);

      if (!workerResponse.ok || !userResponse.ok || !serviceResponse.ok) {
        throw new Error("Could not load worker records from backend");
      }

      const [backendWorkers, backendUsers, backendServices] = (await Promise.all([
        workerResponse.json(),
        userResponse.json(),
        serviceResponse.json(),
      ])) as [BackendWorker[], BackendUser[], BackendService[]];

      const usersById = new Map(backendUsers.map((user) => [user._id, user]));
      const servicesById = new Map(backendServices.map((service) => [service._id, service]));

      setWorkers(
        backendWorkers.map((worker, index) => {
          const user = worker.user_id ? usersById.get(worker.user_id) : undefined;
          const service = worker.service_id ? servicesById.get(worker.service_id) : undefined;
          const name = user?.name || `Worker ${worker.id ?? index + 1}`;
          const serviceName = service?.name || worker.skills?.split(",")[0] || "General Service";

          return {
            mongoId: worker._id,
            id: worker.id ? `#UG-${String(worker.id).padStart(4, "0")}` : worker._id,
            name,
            email: user?.email || "No email",
            initials: makeInitials(name),
            initialsBg: index % 2 === 0 ? "bg-brand/15 text-brand" : "bg-amber-100 text-amber-700",
            service: serviceName.toUpperCase(),
            serviceClass: serviceClasses[index % serviceClasses.length],
            city: cityFallbacks[index % cityFallbacks.length],
            cnic: worker.cnic || "Not provided",
            skills: worker.skills || "Not provided",
            rating: worker.rating ?? 0,
            totalJobs: worker.total_jobs ?? 0,
            reliability: Math.round(worker.reliability_score ?? 0),
            status: statusToTab(worker.verification_status),
          };
        }),
      );
    } catch (error) {
      toast.error("Workers could not be loaded", {
        description: error instanceof Error ? error.message : "Please check the backend server.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkers();
  }, []);

  const filteredWorkers = useMemo(() => {
    return workers.filter((worker) => {
      const matchesTab = activeTab === "All" || worker.status === activeTab;
      const matchesSearch =
        !normalizedSearch ||
        [
          worker.id,
          worker.name,
          worker.email,
          worker.service,
          worker.city,
          worker.status,
          worker.cnic,
          worker.skills,
        ].some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesTab && matchesSearch;
    });
  }, [activeTab, normalizedSearch, workers]);

  const totalPages = Math.max(1, Math.ceil(filteredWorkers.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * pageSize;
  const pageWorkers = filteredWorkers.slice(pageStart, pageStart + pageSize);
  const selectedOnPage =
    pageWorkers.length > 0 && pageWorkers.every((worker) => selectedWorkerIds.includes(worker.id));
  const selectedExportWorkers =
    selectedWorkerIds.length > 0
      ? filteredWorkers.filter((worker) => selectedWorkerIds.includes(worker.id))
      : filteredWorkers;

  useEffect(() => {
    setCurrentPage(1);
    setSelectedWorkerIds([]);
  }, [activeTab, searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const toggleWorkerSelection = (workerId: string) => {
    setSelectedWorkerIds((current) =>
      current.includes(workerId) ? current.filter((id) => id !== workerId) : [...current, workerId],
    );
  };

  const togglePageSelection = () => {
    const pageIds = pageWorkers.map((worker) => worker.id);
    setSelectedWorkerIds((current) =>
      selectedOnPage
        ? current.filter((id) => !pageIds.includes(id))
        : Array.from(new Set([...current, ...pageIds])),
    );
  };

  const updateWorkerStatus = async (worker: Worker, status: Exclude<WorkerStatus, "All">) => {
    setUpdatingWorkerId(worker.mongoId);

    try {
      const response = await apiFetch(`/workers/${worker.mongoId}`, {
        method: "PUT",
        body: JSON.stringify({ verification_status: tabToBackendStatus(status) }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Worker status update failed");
      }

      setWorkers((current) =>
        current.map((item) => (item.mongoId === worker.mongoId ? { ...item, status } : item)),
      );

      toast.success(`Worker ${status === "Verified" ? "approved" : "rejected"}`, {
        description: `${worker.name} is now marked as ${status.toLowerCase()}.`,
      });
    } catch (error) {
      toast.error("Status was not updated", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setUpdatingWorkerId(null);
    }
  };

  const runWorkerVerification = async (worker: Worker) => {
    setVerifyingWorkerId(worker.mongoId);

    try {
      const response = await apiFetch(`/verification/workers/${worker.mongoId}`, {
        method: "POST",
        body: JSON.stringify({ apply: false }),
      });
      const data = (await response.json()) as VerificationResult & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Worker verification failed");
      }

      const recommendation =
        data.recommendation === "approved"
          ? "Approve"
          : data.recommendation === "rejected"
            ? "Reject"
            : "Keep pending";

      toast.success("AI verification completed", {
        description: `${data.confidence ?? 0}% confidence. Recommendation: ${recommendation}. ${
          data.notes?.[0] || ""
        }`,
      });
    } catch (error) {
      toast.error("AI verification failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setVerifyingWorkerId(null);
    }
  };

  const handleExportCsv = () => {
    const rows = [
      [
        "Worker ID",
        "Name",
        "Email",
        "Service",
        "City",
        "CNIC",
        "Skills",
        "Rating",
        "Total Jobs",
        "Reliability",
        "Status",
      ],
      ...selectedExportWorkers.map((worker) => [
        worker.id,
        worker.name,
        worker.email,
        worker.service,
        worker.city,
        worker.cnic,
        worker.skills,
        worker.rating.toFixed(1),
        worker.totalJobs,
        `${worker.reliability}%`,
        worker.status,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => csvEscape(String(cell))).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ustadgo-workers-${activeTab.toLowerCase().replaceAll(" ", "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success("Workers CSV downloaded", {
      description:
        selectedWorkerIds.length > 0
          ? `Exported ${selectedExportWorkers.length} selected worker records.`
          : `Exported ${selectedExportWorkers.length} filtered worker records.`,
    });
  };

  return (
    <div className="min-h-screen bg-surface-muted flex">
      <AdminSidebar active="Workers" />

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
            <span className="font-semibold text-brand">Workers</span>
          </nav>
        </AdminTopbar>

        <main className="flex-1 px-6 lg:px-10 py-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-1 p-1 bg-background rounded-2xl border border-border shadow-sm">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === tab
                      ? "bg-gradient-to-br from-brand to-brand-light text-brand-foreground shadow-md"
                      : "text-foreground/70 hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search workers by name, CNIC, skill or city..."
                className="w-full h-12 pl-11 pr-4 rounded-2xl bg-background border border-border text-sm focus:outline-none focus:border-brand transition-all shadow-sm"
              />
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              className="h-12 px-5 rounded-2xl bg-background border border-border text-sm font-semibold text-foreground hover:bg-surface-muted transition-colors flex items-center gap-2 shadow-sm"
            >
              <Download className="size-4" />
              Export CSV
            </button>
          </div>

          {(searchTerm || activeTab !== "All") && (
            <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground">
              Showing {filteredWorkers.length.toLocaleString()} worker
              {filteredWorkers.length === 1 ? "" : "s"} matching the current search and tab.
            </div>
          )}

          <div className="bg-background rounded-3xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-6 py-4 text-left w-10">
                      <input
                        type="checkbox"
                        checked={selectedOnPage}
                        onChange={togglePageSelection}
                        className="rounded border-border accent-brand"
                      />
                    </th>
                    <th className="px-2 py-4 text-left font-semibold">Worker ID</th>
                    <th className="px-4 py-4 text-left font-semibold">Name</th>
                    <th className="px-4 py-4 text-left font-semibold">Service / CNIC</th>
                    <th className="px-4 py-4 text-left font-semibold">City</th>
                    <th className="px-4 py-4 text-left font-semibold">Rating</th>
                    <th className="px-4 py-4 text-left font-semibold">Jobs</th>
                    <th className="px-6 py-4 text-left font-semibold">Reliability</th>
                    <th className="px-6 py-4 text-left font-semibold">Status</th>
                    <th className="px-6 py-4 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={10} className="px-6 py-10 text-center text-muted-foreground">
                        Loading workers from backend...
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    pageWorkers.map((w) => (
                      <tr
                        key={w.mongoId}
                        className="border-t border-border hover:bg-surface-muted/40 transition-colors"
                      >
                        <td className="px-6 py-5">
                          <input
                            type="checkbox"
                            checked={selectedWorkerIds.includes(w.id)}
                            onChange={() => toggleWorkerSelection(w.id)}
                            className="rounded border-border accent-brand"
                          />
                        </td>
                        <td className="px-2 py-5 font-medium text-foreground/80">{w.id}</td>
                        <td className="px-4 py-5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`size-10 rounded-full flex items-center justify-center font-bold text-sm ${w.initialsBg}`}
                            >
                              {w.initials}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{w.name}</p>
                              <p className="text-xs text-muted-foreground">{w.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5 min-w-56">
                          <span
                            className={`inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide ${w.serviceClass}`}
                          >
                            {w.service}
                          </span>
                          <p className="mt-2 text-xs text-muted-foreground">{w.cnic}</p>
                        </td>
                        <td className="px-4 py-5 text-foreground/80">{w.city}</td>
                        <td className="px-4 py-5">
                          <div className="flex items-center gap-1.5">
                            <Star className="size-4 fill-amber-400 text-amber-400" />
                            <span className="font-semibold text-foreground">
                              {w.rating.toFixed(1)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-5 font-semibold text-foreground">{w.totalJobs}</td>
                        <td className="px-6 py-5 w-48">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-surface-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-brand to-brand-light"
                                style={{ width: `${w.reliability}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-brand min-w-[2.5rem] text-right">
                              {w.reliability}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${
                              w.status === "Verified"
                                ? "bg-emerald-100 text-emerald-700"
                                : w.status === "Rejected"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {w.status}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => runWorkerVerification(w)}
                              disabled={verifyingWorkerId === w.mongoId}
                              className="size-9 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                              title="Run AI verification"
                            >
                              <ShieldCheck
                                className={`size-4 ${
                                  verifyingWorkerId === w.mongoId ? "animate-pulse" : ""
                                }`}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateWorkerStatus(w, "Verified")}
                              disabled={updatingWorkerId === w.mongoId || w.status === "Verified"}
                              className="size-9 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                              title="Approve worker"
                            >
                              <Check className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateWorkerStatus(w, "Rejected")}
                              disabled={updatingWorkerId === w.mongoId || w.status === "Rejected"}
                              className="size-9 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                              title="Reject worker"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                  {!loading && pageWorkers.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-6 py-10 text-center text-muted-foreground">
                        No workers match this search.
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
                  {filteredWorkers.length === 0 ? 0 : pageStart + 1}-
                  {Math.min(pageStart + pageSize, filteredWorkers.length)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-foreground">
                  {filteredWorkers.length.toLocaleString()}
                </span>{" "}
                workers
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
                  (p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`size-9 rounded-lg text-sm font-semibold transition-colors ${
                        safeCurrentPage === p
                          ? "bg-brand text-brand-foreground shadow-md"
                          : "text-foreground/70 hover:bg-surface-muted"
                      }`}
                    >
                      {p}
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
    </div>
  );
}

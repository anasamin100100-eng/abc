import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Search,
  UserCheck,
  Wrench,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { apiFetch } from "@/utils/api";

export const Route = createFileRoute("/prebookings")({
  component: PrebookingsPage,
  head: () => ({
    meta: [
      { title: "Prebookings - UstadGo Admin" },
      {
        name: "description",
        content: "Manage individual home service prebookings, client appointments, and scheduled Ustads.",
      },
    ],
  }),
});

type PrebookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

type BackendPrebooking = {
  _id: string;
  id?: number;
  client_id?: string;
  worker_id?: string;
  service_id?: string;
  scheduled_at?: string;
  status?: PrebookingStatus;
  notes?: string;
  reliability_score?: number;
  created_at?: string;
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

type Prebooking = {
  mongoId: string;
  id: string;
  clientName: string;
  workerName: string;
  serviceName: string;
  scheduledAt: string;
  notes: string;
  reliabilityScore: number;
  status: PrebookingStatus;
  createdAt: string;
};

const statusClasses: Record<PrebookingStatus, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
  completed: "bg-blue-100 text-blue-700 border-blue-200",
};

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleString("en-PK", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not scheduled";

const pageSize = 8;

function PrebookingsPage() {
  const [prebookings, setPrebookings] = useState<Prebooking[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const loadPrebookings = async () => {
    setLoading(true);
    try {
      const [prebookingResponse, userResponse, serviceResponse] = await Promise.all([
        apiFetch("/prebookings"),
        apiFetch("/users"),
        apiFetch("/services"),
      ]);

      if (!prebookingResponse.ok || !userResponse.ok || !serviceResponse.ok) {
        throw new Error("Could not load prebookings data from MongoDB");
      }

      const [backendPrebookings, backendUsers, backendServices] = (await Promise.all([
        prebookingResponse.json(),
        userResponse.json(),
        serviceResponse.json(),
      ])) as [BackendPrebooking[], BackendUser[], BackendService[]];

      const usersById = new Map(backendUsers.map((u) => [u._id, u]));
      const servicesById = new Map(backendServices.map((s) => [s._id, s]));

      setPrebookings(
        backendPrebookings.map((booking, index) => {
          const client = booking.client_id ? usersById.get(booking.client_id) : undefined;
          const worker = booking.worker_id ? usersById.get(booking.worker_id) : undefined;
          const service = booking.service_id ? servicesById.get(booking.service_id) : undefined;

          return {
            mongoId: booking._id,
            id: booking.id ? `#PRB-${String(booking.id).padStart(4, "0")}` : `#PRB-${String(index + 1).padStart(4, "0")}`,
            clientName: client?.name || "Unassigned Client",
            workerName: worker?.name || "Unassigned Ustad",
            serviceName: service?.name || "General Home Service",
            scheduledAt: formatDate(booking.scheduled_at),
            notes: booking.notes || "No visit instructions provided.",
            reliabilityScore: booking.reliability_score || 95.0,
            status: booking.status || "pending",
            createdAt: formatDate(booking.created_at),
          };
        })
      );
    } catch (error) {
      toast.error("Prebookings could not be loaded", {
        description: error instanceof Error ? error.message : "Please check your network and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrebookings();
  }, []);

  const filteredBookings = useMemo(() => {
    return prebookings.filter((booking) => {
      const matchesFilter = activeFilter === "All" || booking.status.toLowerCase() === activeFilter.toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        [
          booking.id,
          booking.clientName,
          booking.workerName,
          booking.serviceName,
          booking.notes,
          booking.status,
        ].some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, prebookings, normalizedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * pageSize;
  const pageBookings = filteredBookings.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchTerm]);

  const updateBookingStatus = async (mongoId: string, status: PrebookingStatus) => {
    setUpdatingId(mongoId);
    try {
      const response = await apiFetch(`/prebookings/${mongoId}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Could not update prebooking status");
      }

      setPrebookings((current) =>
        current.map((booking) => (booking.mongoId === mongoId ? { ...booking, status } : booking))
      );

      toast.success("Prebooking updated", {
        description: `Appointment status is now ${status}.`,
      });
    } catch (error) {
      toast.error("Failed to update status", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const statusCounts = {
    all: prebookings.length,
    pending: prebookings.filter((b) => b.status === "pending").length,
    confirmed: prebookings.filter((b) => b.status === "confirmed").length,
    cancelled: prebookings.filter((b) => b.status === "cancelled").length,
  };

  return (
    <div className="min-h-screen bg-surface-muted flex">
      <AdminSidebar active="Prebookings" />

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
            <span className="font-semibold text-brand font-medium">Prebookings</span>
          </nav>
        </AdminTopbar>

        <main className="flex-1 px-6 lg:px-10 py-8 space-y-6">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
            <div>
              <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <CalendarCheck className="size-6" />
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
                Ustad Prebookings
              </h1>
              <p className="mt-1 text-muted-foreground">
                Monitor and verify client appointments booked for individual home issues before execution.
              </p>
            </div>

            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by ID, client, Ustad, service or instructions..."
                className="w-full h-12 pl-11 pr-4 rounded-2xl bg-background border border-border text-sm focus:outline-none focus:border-brand transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "All", count: statusCounts.all, color: "text-brand bg-brand/10 border-brand/20" },
              { label: "Pending", count: statusCounts.pending, color: "text-amber-700 bg-amber-100 border-amber-200" },
              { label: "Confirmed", count: statusCounts.confirmed, color: "text-emerald-700 bg-emerald-100 border-emerald-200" },
              { label: "Cancelled", count: statusCounts.cancelled, color: "text-rose-700 bg-rose-100 border-rose-200" },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setActiveFilter(item.label)}
                className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                  activeFilter === item.label
                    ? `${item.color} shadow-sm ring-1 ring-offset-0 ring-brand/10`
                    : "border-border bg-background text-foreground hover:bg-surface-muted"
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{item.label} Prebookings</p>
                <p className="mt-2 text-2xl font-bold">{item.count}</p>
              </button>
            ))}
          </div>

          <div className="bg-background rounded-3xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-4 text-left font-semibold">Booking ID</th>
                    <th className="px-4 py-4 text-left font-semibold">Client / Ustad</th>
                    <th className="px-4 py-4 text-left font-semibold">Service Type</th>
                    <th className="px-4 py-4 text-left font-semibold">Scheduled Visit</th>
                    <th className="px-4 py-4 text-left font-semibold">Ustad Reliability</th>
                    <th className="px-4 py-4 text-left font-semibold">Instructions / Notes</th>
                    <th className="px-4 py-4 text-left font-semibold">Status</th>
                    <th className="px-5 py-4 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                        Loading prebookings data from MongoDB...
                      </td>
                    </tr>
                  )}

                  {!loading && pageBookings.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                        No appointments found matching current parameters.
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    pageBookings.map((booking) => (
                      <tr
                        key={booking.mongoId}
                        className="border-t border-border hover:bg-surface-muted/40 transition-colors"
                      >
                        <td className="px-5 py-5">
                          <p className="font-bold text-foreground">{booking.id}</p>
                          <span className="text-[10px] text-muted-foreground">Created: {booking.createdAt}</span>
                        </td>
                        <td className="px-4 py-5">
                          <div className="flex items-start gap-2">
                            <UserCheck className="mt-0.5 size-4 text-brand" />
                            <div>
                              <p className="font-semibold text-foreground">{booking.clientName}</p>
                              <p className="text-xs text-muted-foreground">Ustad: {booking.workerName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-brand">
                            <Wrench className="size-3" />
                            {booking.serviceName}
                          </span>
                        </td>
                        <td className="px-4 py-5 font-medium text-foreground">
                          <div className="flex items-center gap-1.5">
                            <Clock className="size-4 text-orange-500" />
                            <span>{booking.scheduledAt}</span>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-foreground">{booking.reliabilityScore}%</span>
                            <span className="text-[10px] text-muted-foreground">AI Score</span>
                          </div>
                          <div className="w-20 bg-muted rounded-full h-1 mt-1 overflow-hidden">
                            <div
                              className="bg-brand h-full rounded-full"
                              style={{ width: `${booking.reliabilityScore}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-5 min-w-48 max-w-xs">
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {booking.notes}
                          </p>
                        </td>
                        <td className="px-4 py-5">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusClasses[booking.status]}`}
                          >
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-5 py-5">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={booking.status === "confirmed" || updatingId === booking.mongoId}
                              onClick={() => updateBookingStatus(booking.mongoId, "confirmed")}
                              className="size-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              title="Confirm Prebooking"
                            >
                              <CheckCircle2 className="size-4" />
                            </button>
                            <button
                              type="button"
                              disabled={booking.status === "cancelled" || updatingId === booking.mongoId}
                              onClick={() => updateBookingStatus(booking.mongoId, "cancelled")}
                              className="size-8 rounded-lg flex items-center justify-center bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              title="Cancel Prebooking"
                            >
                              <XCircle className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-5 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-bold text-foreground">
                  {filteredBookings.length === 0 ? 0 : pageStart + 1}-
                  {Math.min(pageStart + pageSize, filteredBookings.length)}
                </span>{" "}
                of <span className="font-bold text-foreground">{filteredBookings.length}</span> appointments
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
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
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
                ))}
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

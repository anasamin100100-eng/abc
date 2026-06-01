import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, ChevronLeft, ChevronRight, Download, Star } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { apiFetch } from "@/utils/api";

export const Route = createFileRoute("/reviews")({
  component: ReviewsPage,
  head: () => ({
    meta: [{ title: "Reviews - UstadGo Admin" }],
  }),
});

type BackendReview = {
  _id: string;
  id?: number;
  job_id?: string;
  client_id?: string;
  worker_id?: string;
  rating?: number;
  comment?: string;
  created_at?: string;
};

type BackendUser = { _id: string; name?: string; email?: string };
type BackendJob = { _id: string; service_id?: string; location?: string };
type BackendService = { _id: string; name?: string };

type Review = {
  mongoId: string;
  id: string;
  client: string;
  worker: string;
  service: string;
  location: string;
  rating: number;
  comment: string;
  createdAt: string;
  flagged: boolean;
};

const pageSize = 6;
const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;
const serviceColors = [
  "bg-blue-100 text-blue-700",
  "bg-amber-100 text-amber-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
];

function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [moderatedIds, setModeratedIds] = useState<string[]>([]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const [reviewResponse, userResponse, jobResponse, serviceResponse] = await Promise.all([
        apiFetch("/reviews"),
        apiFetch("/users"),
        apiFetch("/jobs"),
        apiFetch("/services"),
      ]);

      if (!reviewResponse.ok || !userResponse.ok || !jobResponse.ok || !serviceResponse.ok) {
        throw new Error("Could not load reviews from backend");
      }

      const [backendReviews, users, jobs, services] = (await Promise.all([
        reviewResponse.json(),
        userResponse.json(),
        jobResponse.json(),
        serviceResponse.json(),
      ])) as [BackendReview[], BackendUser[], BackendJob[], BackendService[]];

      const usersById = new Map(users.map((user) => [user._id, user]));
      const jobsById = new Map(jobs.map((job) => [job._id, job]));
      const servicesById = new Map(services.map((service) => [service._id, service]));

      setReviews(
        backendReviews.map((review, index) => {
          const job = review.job_id ? jobsById.get(review.job_id) : undefined;
          const service = job?.service_id ? servicesById.get(job.service_id) : undefined;
          const rating = review.rating || 1;

          return {
            mongoId: review._id,
            id: review.id ? `#RV-${String(review.id).padStart(4, "0")}` : `#RV-${index + 1}`,
            client: usersById.get(review.client_id || "")?.name || "Unknown Client",
            worker: usersById.get(review.worker_id || "")?.name || "Unknown Worker",
            service: (service?.name || "General Service").toUpperCase(),
            location: job?.location || "Location not available",
            rating,
            comment: review.comment || "No comment provided.",
            createdAt: review.created_at
              ? new Date(review.created_at).toLocaleDateString("en-GB")
              : "Not available",
            flagged: rating <= 2,
          };
        }),
      );
    } catch (error) {
      toast.error("Reviews could not be loaded", {
        description: error instanceof Error ? error.message : "Please check backend/login.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const visibleReviews = useMemo(() => {
    if (ratingFilter === "all") return reviews;
    return reviews.filter((review) => review.rating === ratingFilter);
  }, [ratingFilter, reviews]);

  const flaggedReviews = reviews.filter(
    (review) => review.flagged && !moderatedIds.includes(review.mongoId),
  );
  const totalPages = Math.max(1, Math.ceil(visibleReviews.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * pageSize;
  const pageReviews = visibleReviews.slice(pageStart, pageStart + pageSize);
  const averageRating =
    reviews.length === 0
      ? 0
      : reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

  useEffect(() => {
    setCurrentPage(1);
  }, [ratingFilter]);

  const handleExport = () => {
    const rows = [
      ["Review ID", "Client", "Worker", "Service", "Rating", "Flagged", "Comment"],
      ...visibleReviews.map((review) => [
        review.id,
        review.client,
        review.worker,
        review.service,
        review.rating,
        review.flagged ? "Yes" : "No",
        review.comment,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => csvEscape(String(cell))).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ustadgo-reviews.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success("Reviews report downloaded");
  };

  const moderateFlagged = (review: Review, action: "removed" | "kept") => {
    setModeratedIds((current) => [...current, review.mongoId]);
    toast.success(`Flagged review ${action}`, {
      description: `${review.client}'s review was ${action}.`,
    });
  };

  return (
    <div className="flex min-h-screen bg-surface-muted">
      <AdminSidebar active="Reviews" />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar>
          <div className="text-sm">
            <span className="text-muted-foreground">Admin Portal</span>
            <span className="mx-2 text-muted-foreground">/</span>
            <span className="font-semibold text-brand">Reviews</span>
          </div>
        </AdminTopbar>

        <main className="flex-1 px-6 lg:px-10 py-6 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Reviews & Moderation</h1>
              <p className="text-muted-foreground mt-1">
                Feedback is loaded from MongoDB and linked with clients, workers, jobs, and services.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-semibold hover:bg-surface-muted"
            >
              <Download className="size-4" />
              Export Reports
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Metric label="Total Reviews" value={reviews.length.toString()} />
            <Metric label="Average Rating" value={averageRating.toFixed(1)} />
            <Metric label="Flagged" value={flaggedReviews.length.toString()} />
            <Metric label="Positive" value={reviews.filter((r) => r.rating >= 4).length.toString()} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold tracking-widest text-muted-foreground">
              FILTER BY RATING:
            </span>
            <button
              type="button"
              onClick={() => setRatingFilter("all")}
              className={`px-5 py-2 rounded-full text-sm font-semibold ${
                ratingFilter === "all"
                  ? "bg-brand text-brand-foreground"
                  : "bg-card border border-border hover:bg-surface-muted"
              }`}
            >
              All Reviews
            </button>
            {[5, 4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => setRatingFilter(rating)}
                className={`px-4 py-2 rounded-full border text-sm font-semibold flex items-center gap-1 ${
                  ratingFilter === rating
                    ? "bg-brand text-brand-foreground border-brand"
                    : "bg-card border-border hover:bg-surface-muted"
                }`}
              >
                {rating} <Star className="size-3.5 fill-amber-400 text-amber-400" />
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">Recent Feedback</h2>
                <span className="text-[11px] font-bold tracking-widest text-muted-foreground bg-surface-muted px-3 py-1.5 rounded-full">
                  {visibleReviews.length} TOTAL
                </span>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {["REVIEW ID", "CLIENT", "WORKER", "SERVICE", "RATING", "COMMENT"].map(
                        (heading) => (
                          <th
                            key={heading}
                            className="text-left px-2 py-4 text-[11px] font-bold tracking-wider text-muted-foreground"
                          >
                            {heading}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-muted-foreground">
                          Loading reviews from backend...
                        </td>
                      </tr>
                    )}
                    {!loading &&
                      pageReviews.map((review, index) => (
                        <tr
                          key={review.mongoId}
                          className={`border-b border-border last:border-0 ${
                            review.flagged ? "bg-red-50/60" : ""
                          }`}
                        >
                          <td className="px-2 py-5 text-sm text-muted-foreground">{review.id}</td>
                          <td className="px-2 py-5 text-sm font-semibold">{review.client}</td>
                          <td className="px-2 py-5 text-sm">{review.worker}</td>
                          <td className="px-2 py-5">
                            <span
                              className={`inline-flex px-3 py-1 rounded-md text-[10px] font-bold tracking-wide ${serviceColors[index % serviceColors.length]}`}
                            >
                              {review.service}
                            </span>
                          </td>
                          <td className="px-2 py-5">
                            <Stars count={review.rating} />
                          </td>
                          <td className="px-2 py-5 text-sm max-w-[240px] truncate">
                            {review.comment}
                          </td>
                        </tr>
                      ))}
                    {!loading && pageReviews.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-muted-foreground">
                          No reviews match this filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <p className="text-[11px] font-bold tracking-widest text-muted-foreground">
                  PAGE {safeCurrentPage} OF {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={safeCurrentPage === 1}
                    className="size-9 rounded-lg border border-border flex items-center justify-center hover:bg-surface-muted disabled:opacity-40"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={safeCurrentPage === totalPages}
                    className="size-9 rounded-lg border border-border flex items-center justify-center hover:bg-surface-muted disabled:opacity-40"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-card rounded-2xl border-2 border-orange-400 overflow-hidden">
                <div className="bg-orange-500 px-5 py-4 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="size-5" />
                    <p className="font-bold text-sm tracking-wide">FLAGGED FOR REVIEW</p>
                  </div>
                  <span className="bg-white text-orange-500 text-[10px] font-bold px-2 py-1 rounded-full">
                    {flaggedReviews.length} NEW
                  </span>
                </div>
                <div className="p-5 space-y-4">
                  {flaggedReviews.slice(0, 4).map((review) => (
                    <div key={review.mongoId} className="border border-border rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-sm">{review.client}</p>
                        <p className="text-xs text-muted-foreground">{review.createdAt}</p>
                      </div>
                      <p className="text-xs italic text-foreground/80">"{review.comment}"</p>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => moderateFlagged(review, "removed")}
                          className="py-2 rounded-lg bg-orange-500 text-white text-xs font-bold"
                        >
                          REMOVE
                        </button>
                        <button
                          type="button"
                          onClick={() => moderateFlagged(review, "kept")}
                          className="py-2 rounded-lg border border-orange-500 text-orange-500 text-xs font-bold"
                        >
                          KEEP
                        </button>
                      </div>
                    </div>
                  ))}
                  {flaggedReviews.length === 0 && (
                    <p className="rounded-xl bg-surface-muted p-4 text-sm text-muted-foreground">
                      No flagged reviews waiting.
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-card rounded-2xl border border-border p-6">
                <p className="text-[11px] font-bold tracking-widest text-muted-foreground">
                  SENTIMENT ANALYSIS
                </p>
                <div className="mt-6 flex items-end justify-between">
                  <div>
                    <p className="text-[11px] font-bold tracking-widest text-muted-foreground">
                      AVG. RATING
                    </p>
                    <p className="text-4xl font-bold mt-1">{averageRating.toFixed(1)}</p>
                  </div>
                  <Stars count={Math.round(averageRating)} />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`size-4 ${
            i <= count
              ? count <= 2
                ? "fill-red-500 text-red-500"
                : "fill-amber-400 text-amber-400"
              : "fill-muted text-muted"
          }`}
        />
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background rounded-2xl border border-border p-5">
      <p className="text-[10px] tracking-widest font-semibold text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

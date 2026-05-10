import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Star,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ChevronRight as Chevron,
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";

export const Route = createFileRoute("/reviews")({
  component: ReviewsPage,
  head: () => ({
    meta: [
      { title: "Reviews - UstadGo Admin" },
      {
        name: "description",
        content:
          "Quality control for UstadGo: review client feedback, flagged comments, sentiment analysis, and average ratings.",
      },
    ],
  }),
});

interface Review {
  id: string;
  client: string;
  clientInitials: string;
  worker: string;
  service: string;
  serviceColor: string;
  rating: number;
  comment: string;
  flagged?: boolean;
}

type FlaggedItem = {
  initials: string;
  name: string;
  time: string;
  text: string;
};

const pageSize = 4;

const reviewSeed: Review[] = [
  {
    id: "#RV-9402",
    client: "Zaid Abbas",
    clientInitials: "ZA",
    worker: "Imran Sheikh",
    service: "PLUMBING",
    serviceColor: "bg-blue-100 text-blue-700",
    rating: 5,
    comment: "Excellent work and very professional service.",
  },
  {
    id: "#RV-8911",
    client: "Mariam Khan",
    clientInitials: "MK",
    worker: "Asif Ali",
    service: "ELECTRICAL",
    serviceColor: "bg-amber-100 text-amber-700",
    rating: 1,
    comment: "Worker did not show up on time and was rude.",
    flagged: true,
  },
  {
    id: "#RV-7742",
    client: "Sana Javeed",
    clientInitials: "SJ",
    worker: "Bilal Ahmed",
    service: "CARPENTRY",
    serviceColor: "bg-teal-100 text-teal-700",
    rating: 4,
    comment: "Good work overall, slight delay in arrival.",
  },
  {
    id: "#RV-6631",
    client: "Faisal Raza",
    clientInitials: "FR",
    worker: "Kasim Gul",
    service: "AC REPAIR",
    serviceColor: "bg-indigo-100 text-indigo-700",
    rating: 5,
    comment: "Highly recommended, fixed it in one visit.",
  },
];

const allReviews: Review[] = Array.from({ length: 48 }, (_, index) => {
  const seed = reviewSeed[index % reviewSeed.length];
  const rating = ([5, 4, 3, 2, 1, 5, 4, 5] as const)[index % 8];

  return {
    ...seed,
    id: `#RV-${9000 + index}`,
    rating,
    flagged: seed.flagged || rating <= 2,
  };
});

const initialFlagged: FlaggedItem[] = [
  {
    initials: "HI",
    name: "Hamza Iqbal",
    time: "2h ago",
    text: '"This app is a scam and the worker stole my money, do not use them ever again!!!"',
  },
  {
    initials: "RS",
    name: "Rashid Sohail",
    time: "5h ago",
    text: '"Worker used inappropriate language when I asked about the pricing..."',
  },
  {
    initials: "NA",
    name: "Nadia Akram",
    time: "8h ago",
    text: '"The quoted price changed after the worker arrived."',
  },
  {
    initials: "TR",
    name: "Taimoor Raza",
    time: "1d ago",
    text: '"I need support to review this disputed booking."',
  },
  {
    initials: "SK",
    name: "Sadia Khan",
    time: "1d ago",
    text: '"The job was cancelled without proper explanation."',
  },
];

const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;

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

function ReviewsPage() {
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [flagged, setFlagged] = useState(initialFlagged);
  const [showAllFlagged, setShowAllFlagged] = useState(false);

  const visibleReviews = useMemo(() => {
    if (ratingFilter === "all") return allReviews;
    return allReviews.filter((review) => review.rating === ratingFilter);
  }, [ratingFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleReviews.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * pageSize;
  const pageReviews = visibleReviews.slice(pageStart, pageStart + pageSize);
  const flaggedToShow = showAllFlagged ? flagged : flagged.slice(0, 2);

  useEffect(() => {
    setCurrentPage(1);
  }, [ratingFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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
    link.download = `ustadgo-reviews-${ratingFilter === "all" ? "all" : `${ratingFilter}-star`}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success("Reviews report downloaded", {
      description: `Exported ${visibleReviews.length} review records.`,
    });
  };

  const moderateFlagged = (name: string, action: "removed" | "kept") => {
    setFlagged((current) => current.filter((item) => item.name !== name));
    toast.success(`Flagged review ${action}`, {
      description: `${name}'s flagged item was ${action}.`,
    });
  };

  return (
    <div className="flex min-h-screen bg-surface-muted">
      <AdminSidebar active="Reviews" />
      <div className="flex-1 flex flex-col">
        <AdminTopbar>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Admin Portal</span>
            <Chevron className="size-4 text-muted-foreground" />
            <span className="font-semibold text-brand">Reviews</span>
          </div>
        </AdminTopbar>

        <main className="flex-1 px-6 lg:px-10 py-6 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
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
                  className={`px-4 py-2 rounded-full border text-sm font-semibold transition-colors flex items-center gap-1 ${
                    ratingFilter === rating
                      ? "bg-brand text-brand-foreground border-brand"
                      : "bg-card border-border hover:bg-surface-muted"
                  }`}
                >
                  {rating} <Star className="size-3.5 fill-amber-400 text-amber-400" />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-semibold hover:bg-surface-muted transition-colors"
            >
              <Download className="size-4" />
              Export Reports
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">Recent Feedback</h2>
                <span className="text-[11px] font-bold tracking-widest text-muted-foreground bg-surface-muted px-3 py-1.5 rounded-full">
                  DISPLAYING {visibleReviews.length} TOTAL
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
                    {pageReviews.map((review) => (
                      <tr
                        key={review.id}
                        className={`border-b border-border last:border-0 ${
                          review.flagged ? "bg-red-50/60" : ""
                        }`}
                      >
                        <td className="px-2 py-5 text-sm text-muted-foreground">{review.id}</td>
                        <td className="px-2 py-5">
                          <div className="flex items-center gap-2">
                            <div className="size-8 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-[10px]">
                              {review.clientInitials}
                            </div>
                            <span className="text-sm font-semibold">{review.client}</span>
                          </div>
                        </td>
                        <td className="px-2 py-5 text-sm">{review.worker}</td>
                        <td className="px-2 py-5">
                          <span
                            className={`inline-flex px-3 py-1 rounded-md text-[10px] font-bold tracking-wide ${review.serviceColor}`}
                          >
                            {review.service}
                          </span>
                        </td>
                        <td className="px-2 py-5">
                          <Stars count={review.rating} />
                        </td>
                        <td
                          className={`px-2 py-5 text-sm max-w-[200px] truncate ${
                            review.flagged ? "text-red-600 font-medium" : ""
                          }`}
                        >
                          {review.comment}
                        </td>
                      </tr>
                    ))}
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
                    className="size-9 rounded-lg border border-border flex items-center justify-center hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  {[1, 2, 3].map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(Math.min(page, totalPages))}
                      disabled={page > totalPages}
                      className={`size-9 rounded-lg text-sm font-semibold ${
                        safeCurrentPage === page
                          ? "bg-brand text-brand-foreground"
                          : "hover:bg-surface-muted"
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      {page}
                    </button>
                  ))}
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

            <div className="space-y-6">
              <div className="bg-card rounded-2xl border-2 border-orange-400 overflow-hidden">
                <div className="bg-orange-500 px-5 py-4 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="size-5" />
                    <p className="font-bold text-sm tracking-wide">FLAGGED FOR REVIEW</p>
                  </div>
                  <span className="bg-white text-orange-500 text-[10px] font-bold px-2 py-1 rounded-full">
                    {flagged.length} NEW
                  </span>
                </div>
                <div className="p-5 space-y-4">
                  {flaggedToShow.map((item) => (
                    <div key={item.name} className="border border-border rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-[10px]">
                            {item.initials}
                          </div>
                          <p className="font-semibold text-sm">{item.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{item.time}</p>
                      </div>
                      <p className="text-xs italic text-foreground/80">{item.text}</p>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => moderateFlagged(item.name, "removed")}
                          className="py-2 rounded-lg bg-orange-500 text-white text-xs font-bold tracking-wide"
                        >
                          REMOVE
                        </button>
                        <button
                          type="button"
                          onClick={() => moderateFlagged(item.name, "kept")}
                          className="py-2 rounded-lg border border-orange-500 text-orange-500 text-xs font-bold tracking-wide"
                        >
                          KEEP
                        </button>
                      </div>
                    </div>
                  ))}
                  {flagged.length === 0 && (
                    <p className="rounded-xl bg-surface-muted p-4 text-sm text-muted-foreground">
                      No flagged reviews waiting.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAllFlagged((current) => !current)}
                    className="w-full py-2.5 rounded-lg bg-orange-50 text-orange-600 text-xs font-bold tracking-wide"
                  >
                    {showAllFlagged ? "SHOW LESS FLAGGED" : `VIEW ALL FLAGGED (${flagged.length})`}
                  </button>
                </div>
              </div>

              <div className="bg-card rounded-2xl border border-border p-6">
                <p className="text-[11px] font-bold tracking-widest text-muted-foreground">
                  SENTIMENT ANALYSIS
                </p>
                <div className="space-y-4 mt-5">
                  {[
                    {
                      label: "Positive (4-5 Stars)",
                      pct: 82,
                      color: "bg-gradient-to-r from-brand to-brand-light",
                      text: "text-brand",
                    },
                    {
                      label: "Neutral (3 Stars)",
                      pct: 12,
                      color: "bg-muted-foreground/40",
                      text: "text-muted-foreground",
                    },
                    {
                      label: "Negative (1-2 Stars)",
                      pct: 6,
                      color: "bg-red-500",
                      text: "text-red-500",
                    },
                  ].map((sentiment) => (
                    <div key={sentiment.label}>
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground/80">{sentiment.label}</span>
                        <span className={`font-bold ${sentiment.text}`}>{sentiment.pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-muted mt-1.5 overflow-hidden">
                        <div
                          className={`h-full ${sentiment.color}`}
                          style={{ width: `${sentiment.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-end justify-between">
                  <div>
                    <p className="text-[11px] font-bold tracking-widest text-muted-foreground">
                      AVG. RATING
                    </p>
                    <p className="text-4xl font-bold mt-1">4.7</p>
                  </div>
                  <Stars count={5} />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

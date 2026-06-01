import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, CreditCard, Search, Wallet } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { apiFetch } from "@/utils/api";

export const Route = createFileRoute("/payments")({
  component: PaymentsPage,
  head: () => ({
    meta: [
      { title: "Payments - UstadGo Admin" },
      {
        name: "description",
        content: "Monitor UstadGo payment status, methods, clients, workers, and refunds.",
      },
    ],
  }),
});

type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
type PaymentFilter = "All Payments" | "Pending" | "Completed" | "Failed" | "Refunded";

type BackendPayment = {
  _id: string;
  id?: number;
  job_id?: string;
  client_id?: string;
  worker_id?: string;
  amount?: number;
  payment_status?: PaymentStatus;
  payment_method?: "cash" | "card" | "online";
  paid_at?: string | null;
};

type BackendUser = {
  _id: string;
  name?: string;
  email?: string;
};

type BackendJob = {
  _id: string;
  id?: string;
  location?: string;
  status?: string;
};

type Payment = {
  mongoId: string;
  id: string;
  jobId: string;
  client: string;
  worker: string;
  amount: number;
  amountLabel: string;
  method: string;
  status: PaymentStatus;
  paidAt: string;
  location: string;
};

const pageSize = 8;
const filters: PaymentFilter[] = ["All Payments", "Pending", "Completed", "Failed", "Refunded"];

const statusLabels: Record<PaymentStatus, PaymentFilter> = {
  pending: "Pending",
  completed: "Completed",
  failed: "Failed",
  refunded: "Refunded",
};

const statusClasses: Record<PaymentStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  refunded: "bg-blue-100 text-blue-700",
};

const methodLabels: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  online: "Online",
};

const formatCurrency = (value?: number) =>
  typeof value === "number" && Number.isFinite(value) ? `Rs. ${value.toLocaleString()}` : "Rs. 0";

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("en-PK", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not paid yet";

function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeFilter, setActiveFilter] = useState<PaymentFilter>("All Payments");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const loadPayments = async () => {
    setLoading(true);

    try {
      const [paymentResponse, userResponse, jobResponse] = await Promise.all([
        apiFetch("/payments"),
        apiFetch("/users"),
        apiFetch("/jobs"),
      ]);

      if (!paymentResponse.ok || !userResponse.ok || !jobResponse.ok) {
        throw new Error("Could not load payment records from backend");
      }

      const [backendPayments, backendUsers, backendJobs] = (await Promise.all([
        paymentResponse.json(),
        userResponse.json(),
        jobResponse.json(),
      ])) as [BackendPayment[], BackendUser[], BackendJob[]];

      const usersById = new Map(backendUsers.map((user) => [user._id, user]));
      const jobsById = new Map(backendJobs.map((job) => [job._id, job]));

      setPayments(
        backendPayments.map((payment, index) => {
          const client = payment.client_id ? usersById.get(payment.client_id) : undefined;
          const worker = payment.worker_id ? usersById.get(payment.worker_id) : undefined;
          const job = payment.job_id ? jobsById.get(payment.job_id) : undefined;
          const amount = payment.amount || 0;

          return {
            mongoId: payment._id,
            id: payment.id ? `#PAY-${String(payment.id).padStart(4, "0")}` : `#PAY-${index + 1}`,
            jobId: job?.id || "Unlinked job",
            client: client?.name || "Unknown client",
            worker: worker?.name || "Unknown worker",
            amount,
            amountLabel: formatCurrency(amount),
            method: methodLabels[payment.payment_method || "cash"] || "Cash",
            status: payment.payment_status || "pending",
            paidAt: formatDate(payment.paid_at),
            location: job?.location || "Location not available",
          };
        }),
      );
    } catch (error) {
      toast.error("Payments could not be loaded", {
        description: error instanceof Error ? error.message : "Please check the backend server.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const matchesFilter =
        activeFilter === "All Payments" || statusLabels[payment.status] === activeFilter;
      const matchesSearch =
        !normalizedSearch ||
        [
          payment.id,
          payment.jobId,
          payment.client,
          payment.worker,
          payment.amountLabel,
          payment.method,
          payment.location,
          statusLabels[payment.status],
        ].some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, normalizedSearch, payments]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * pageSize;
  const pagePayments = filteredPayments.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const updatePaymentStatus = async (payment: Payment, status: PaymentStatus) => {
    setUpdatingPaymentId(payment.mongoId);

    try {
      const response = await apiFetch(`/payments/${payment.mongoId}`, {
        method: "PUT",
        body: JSON.stringify({
          payment_status: status,
          paid_at: status === "completed" ? new Date().toISOString() : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Payment update failed");
      }

      setPayments((current) =>
        current.map((item) =>
          item.mongoId === payment.mongoId
            ? {
                ...item,
                status,
                paidAt: status === "completed" ? formatDate(new Date().toISOString()) : "Not paid yet",
              }
            : item,
        ),
      );

      toast.success("Payment status updated", {
        description: `${payment.id} is now ${statusLabels[status].toLowerCase()}.`,
      });
    } catch (error) {
      toast.error("Payment was not updated", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  const completedRevenue = payments
    .filter((payment) => payment.status === "completed")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const pendingAmount = payments
    .filter((payment) => payment.status === "pending")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const refundedAmount = payments
    .filter((payment) => payment.status === "refunded")
    .reduce((sum, payment) => sum + payment.amount, 0);

  const statusCounts = filters.slice(1).map((filter) => ({
    label: filter,
    count: payments.filter((payment) => statusLabels[payment.status] === filter).length,
  }));

  return (
    <div className="min-h-screen bg-surface-muted flex">
      <AdminSidebar active="Payments" />

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
            <span className="font-semibold text-brand">Payments</span>
          </nav>
        </AdminTopbar>

        <main className="flex-1 px-6 lg:px-10 py-8 space-y-6">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
            <div>
              <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <CreditCard className="size-6" />
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
                Payment Monitoring
              </h1>
              <p className="mt-1 text-muted-foreground">
                Track client payments, worker payouts, payment methods, and refund state.
              </p>
            </div>

            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search payments, jobs, clients or workers..."
                className="w-full h-12 pl-11 pr-4 rounded-2xl bg-background border border-border text-sm focus:outline-none focus:border-brand transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <SummaryCard
              label="Completed Revenue"
              value={formatCurrency(completedRevenue)}
              tone="text-emerald-700 bg-emerald-100"
            />
            <SummaryCard
              label="Pending Amount"
              value={formatCurrency(pendingAmount)}
              tone="text-amber-700 bg-amber-100"
            />
            <SummaryCard
              label="Refunded Amount"
              value={formatCurrency(refundedAmount)}
              tone="text-blue-700 bg-blue-100"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                    <th className="px-5 py-4 text-left font-semibold">Payment</th>
                    <th className="px-4 py-4 text-left font-semibold">Job</th>
                    <th className="px-4 py-4 text-left font-semibold">Client / Worker</th>
                    <th className="px-4 py-4 text-left font-semibold">Amount</th>
                    <th className="px-4 py-4 text-left font-semibold">Method</th>
                    <th className="px-4 py-4 text-left font-semibold">Paid Date</th>
                    <th className="px-4 py-4 text-left font-semibold">Status</th>
                    <th className="px-5 py-4 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-muted-foreground">
                        Loading payments from backend...
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    pagePayments.map((payment) => (
                      <tr
                        key={payment.mongoId}
                        className="border-t border-border hover:bg-surface-muted/40 transition-colors"
                      >
                        <td className="px-5 py-5">
                          <p className="font-bold text-foreground">{payment.id}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{payment.location}</p>
                        </td>
                        <td className="px-4 py-5 font-semibold text-foreground">{payment.jobId}</td>
                        <td className="px-4 py-5 min-w-48">
                          <p className="font-semibold text-foreground">{payment.client}</p>
                          <p className="text-xs text-muted-foreground">Worker: {payment.worker}</p>
                        </td>
                        <td className="px-4 py-5 text-base font-bold text-brand">
                          {payment.amountLabel}
                        </td>
                        <td className="px-4 py-5">
                          <span className="inline-flex items-center gap-2 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-bold text-foreground">
                            <Wallet className="size-3.5" />
                            {payment.method}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-foreground/80">{payment.paidAt}</td>
                        <td className="px-4 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${statusClasses[payment.status]}`}
                          >
                            {statusLabels[payment.status]}
                          </span>
                        </td>
                        <td className="px-5 py-5">
                          <div className="flex flex-wrap gap-2 min-w-72">
                            <PaymentButton
                              label="Complete"
                              disabled={
                                payment.status === "completed" ||
                                updatingPaymentId === payment.mongoId
                              }
                              onClick={() => updatePaymentStatus(payment, "completed")}
                            />
                            <PaymentButton
                              label="Pending"
                              disabled={
                                payment.status === "pending" ||
                                updatingPaymentId === payment.mongoId
                              }
                              onClick={() => updatePaymentStatus(payment, "pending")}
                            />
                            <PaymentButton
                              label="Failed"
                              danger
                              disabled={
                                payment.status === "failed" ||
                                updatingPaymentId === payment.mongoId
                              }
                              onClick={() => updatePaymentStatus(payment, "failed")}
                            />
                            <PaymentButton
                              label="Refund"
                              disabled={
                                payment.status === "refunded" ||
                                updatingPaymentId === payment.mongoId
                              }
                              onClick={() => updatePaymentStatus(payment, "refunded")}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}

                  {!loading && pagePayments.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-muted-foreground">
                        No payments match this filter.
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
                  {filteredPayments.length === 0 ? 0 : pageStart + 1}-
                  {Math.min(pageStart + pageSize, filteredPayments.length)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-foreground">{filteredPayments.length}</span>{" "}
                payments
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
    </div>
  );
}

function SummaryCard({ label, tone, value }: { label: string; tone: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${tone}`}>
        {label}
      </span>
      <p className="mt-3 text-3xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function PaymentButton({
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

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Wallet } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { apiFetch } from "@/utils/api";

export const Route = createFileRoute("/withdrawals")({
  component: WithdrawalsPage,
  head: () => ({ meta: [{ title: "Withdrawals - UstadGo Admin" }] }),
});

type User = { _id: string; name?: string; email?: string };
type Worker = { _id: string; user_id?: string; verification_status?: string; total_jobs?: number };
type Payment = { worker_id?: string; amount?: number; payment_status?: string };

type WithdrawalRow = {
  id: string;
  worker: string;
  email: string;
  jobs: number;
  available: number;
  status: "Ready" | "Pending Jobs" | "Below Minimum";
};

function WithdrawalsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  useEffect(() => {
    async function loadWithdrawals() {
      setLoading(true);
      try {
        const [usersResponse, workersResponse, paymentsResponse] = await Promise.all([
          apiFetch("/users"),
          apiFetch("/workers"),
          apiFetch("/payments"),
        ]);
        if (!usersResponse.ok || !workersResponse.ok || !paymentsResponse.ok) {
          throw new Error("Could not load withdrawal data from backend");
        }
        setUsers((await usersResponse.json()) as User[]);
        setWorkers((await workersResponse.json()) as Worker[]);
        setPayments((await paymentsResponse.json()) as Payment[]);
      } catch (error) {
        toast.error("Withdrawals could not be loaded", {
          description: error instanceof Error ? error.message : "Please check backend/login.",
        });
      } finally {
        setLoading(false);
      }
    }
    loadWithdrawals();
  }, []);

  const usersById = useMemo(() => new Map(users.map((user) => [user._id, user])), [users]);
  const rows: WithdrawalRow[] = workers
    .map((worker) => {
      const user = worker.user_id ? usersById.get(worker.user_id) : undefined;
      const gross = payments
        .filter(
          (payment) => payment.worker_id === worker.user_id && payment.payment_status === "completed",
        )
        .reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const available = Math.round(gross * 0.875);
      const status =
        available >= 5000
          ? "Ready"
          : (worker.total_jobs || 0) === 0
            ? "Pending Jobs"
            : "Below Minimum";
      return {
        id: worker._id,
        worker: user?.name || "Unknown Worker",
        email: user?.email || "No email",
        jobs: worker.total_jobs || 0,
        available,
        status,
      };
    })
    .filter(
      (row) =>
        !normalizedSearch ||
        [row.worker, row.email, row.status].some((value) =>
          value.toLowerCase().includes(normalizedSearch),
        ),
    );

  const readyTotal = rows
    .filter((row) => row.status === "Ready")
    .reduce((sum, row) => sum + row.available, 0);

  return (
    <div className="min-h-screen bg-surface-muted flex">
      <AdminSidebar active="Withdrawals" />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search withdrawals..."
              className="w-full bg-surface-muted border border-border rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
        </AdminTopbar>
        <main className="flex-1 px-6 lg:px-10 py-8 space-y-6">
          <div>
            <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Wallet className="size-6" />
            </div>
            <h1 className="mt-4 text-3xl font-bold">Withdrawals</h1>
            <p className="text-muted-foreground mt-1">
              Withdrawal readiness is calculated from completed backend payments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Metric label="Ready Workers" value={rows.filter((row) => row.status === "Ready").length.toString()} />
            <Metric label="Ready Amount" value={`Rs. ${readyTotal.toLocaleString()}`} />
            <Metric label="Minimum Withdrawal" value="Rs. 5,000" />
          </div>

          <div className="rounded-3xl border border-border bg-background overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-4 text-left">Worker</th>
                    <th className="px-4 py-4 text-left">Completed Jobs</th>
                    <th className="px-4 py-4 text-left">Available Balance</th>
                    <th className="px-5 py-4 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                        Loading withdrawals from backend...
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    rows.map((row) => (
                      <tr key={row.id} className="border-t border-border">
                        <td className="px-5 py-4">
                          <p className="font-bold">{row.worker}</p>
                          <p className="text-xs text-muted-foreground">{row.email}</p>
                        </td>
                        <td className="px-4 py-4">{row.jobs}</td>
                        <td className="px-4 py-4 font-bold text-brand">
                          Rs. {row.available.toLocaleString()}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                              row.status === "Ready"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

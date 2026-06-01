import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, LineChart, Search } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { apiFetch } from "@/utils/api";

export const Route = createFileRoute("/earnings")({
  component: EarningsPage,
  head: () => ({ meta: [{ title: "Earnings Reports - UstadGo Admin" }] }),
});

type User = { _id: string; name?: string; email?: string };
type Worker = { user_id?: string; total_jobs?: number; rating?: number };
type Payment = {
  worker_id?: string;
  amount?: number;
  payment_status?: string;
  payment_method?: string;
  paid_at?: string;
};

function EarningsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  useEffect(() => {
    async function loadEarnings() {
      setLoading(true);
      try {
        const [usersResponse, workersResponse, paymentsResponse] = await Promise.all([
          apiFetch("/users"),
          apiFetch("/workers"),
          apiFetch("/payments"),
        ]);
        if (!usersResponse.ok || !workersResponse.ok || !paymentsResponse.ok) {
          throw new Error("Could not load earnings data from backend");
        }
        setUsers((await usersResponse.json()) as User[]);
        setWorkers((await workersResponse.json()) as Worker[]);
        setPayments((await paymentsResponse.json()) as Payment[]);
      } catch (error) {
        toast.error("Earnings could not be loaded", {
          description: error instanceof Error ? error.message : "Please check backend/login.",
        });
      } finally {
        setLoading(false);
      }
    }
    loadEarnings();
  }, []);

  const usersById = useMemo(() => new Map(users.map((user) => [user._id, user])), [users]);
  const rows = workers
    .map((worker) => {
      const user = worker.user_id ? usersById.get(worker.user_id) : undefined;
      const workerPayments = payments.filter(
        (payment) => payment.worker_id === worker.user_id && payment.payment_status === "completed",
      );
      const gross = workerPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const platformFee = Math.round(gross * 0.125);
      const net = gross - platformFee;
      return {
        userId: worker.user_id || "",
        name: user?.name || "Unknown Worker",
        email: user?.email || "No email",
        jobs: worker.total_jobs || 0,
        rating: worker.rating || 0,
        gross,
        platformFee,
        net,
      };
    })
    .filter(
      (row) =>
        !normalizedSearch ||
        [row.name, row.email].some((value) => value.toLowerCase().includes(normalizedSearch)),
    )
    .sort((a, b) => b.gross - a.gross);

  const totalGross = rows.reduce((sum, row) => sum + row.gross, 0);
  const totalFees = rows.reduce((sum, row) => sum + row.platformFee, 0);
  const totalNet = rows.reduce((sum, row) => sum + row.net, 0);

  const exportCsv = () => {
    const csv = [
      ["Worker", "Email", "Jobs", "Rating", "Gross", "Platform Fee", "Net Earnings"],
      ...rows.map((row) => [
        row.name,
        row.email,
        row.jobs,
        row.rating,
        row.gross,
        row.platformFee,
        row.net,
      ]),
    ]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "ustadgo-earnings.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-surface-muted flex">
      <AdminSidebar active="Earnings Reports" />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search worker earnings..."
              className="w-full bg-surface-muted border border-border rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
        </AdminTopbar>
        <main className="flex-1 px-6 lg:px-10 py-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <LineChart className="size-6" />
              </div>
              <h1 className="mt-4 text-3xl font-bold">Earnings Reports</h1>
              <p className="text-muted-foreground mt-1">
                Worker earnings are calculated from completed backend payments.
              </p>
            </div>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-brand-foreground"
            >
              <Download className="size-4" /> Export CSV
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Metric label="Gross Revenue" value={`Rs. ${totalGross.toLocaleString()}`} />
            <Metric label="Platform Fees" value={`Rs. ${totalFees.toLocaleString()}`} />
            <Metric label="Worker Net" value={`Rs. ${totalNet.toLocaleString()}`} />
          </div>

          <div className="rounded-3xl border border-border bg-background overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-4 text-left">Worker</th>
                    <th className="px-4 py-4 text-left">Jobs</th>
                    <th className="px-4 py-4 text-left">Rating</th>
                    <th className="px-4 py-4 text-left">Gross</th>
                    <th className="px-4 py-4 text-left">Platform Fee</th>
                    <th className="px-5 py-4 text-left">Net Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                        Loading earnings from backend...
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    rows.map((row) => (
                      <tr key={row.userId} className="border-t border-border">
                        <td className="px-5 py-4">
                          <p className="font-bold">{row.name}</p>
                          <p className="text-xs text-muted-foreground">{row.email}</p>
                        </td>
                        <td className="px-4 py-4">{row.jobs}</td>
                        <td className="px-4 py-4">{row.rating.toFixed(1)}</td>
                        <td className="px-4 py-4 font-bold">Rs. {row.gross.toLocaleString()}</td>
                        <td className="px-4 py-4">Rs. {row.platformFee.toLocaleString()}</td>
                        <td className="px-5 py-4 font-bold text-brand">
                          Rs. {row.net.toLocaleString()}
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

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Filter, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiFetch } from "@/utils/api";

export const Route = createFileRoute("/clients")({
  component: ClientsPage,
  head: () => ({
    meta: [
      { title: "All Clients - UstadGo Admin" },
      {
        name: "description",
        content:
          "Manage UstadGo clients: view profiles, jobs booked, total spent, and account status across Pakistan.",
      },
    ],
  }),
});

type ClientStatus = "Active" | "Suspended";
type ClientTab = "All Clients" | ClientStatus;

type BackendClient = {
  _id: string;
  id?: number;
  user_id?: string;
  address?: string;
  city?: string;
  status?: "active" | "suspended";
  created_at?: string;
};

type BackendUser = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
};

type BackendJob = {
  client_id?: string;
};

type BackendPayment = {
  client_id?: string;
  amount?: number;
  payment_status?: string;
};

interface Client {
  mongoId: string;
  userId: string;
  id: string;
  name: string;
  email: string;
  initials: string;
  phone: string;
  city: string;
  address: string;
  jobs: number;
  spent: string;
  joined: string;
  status: ClientStatus;
}

const pageSize = 4;
const tabs: ClientTab[] = ["All Clients", "Active", "Suspended"];
const cityOptions = ["Karachi", "Lahore", "Islamabad", "Rawalpindi"] as const;

const makeInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "CL";

const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString()}`;

const formatDate = (date?: string) => {
  if (!date) return "Not available";
  return new Date(date).toLocaleDateString("en-GB");
};

const toClientStatus = (status?: BackendClient["status"]): ClientStatus =>
  status === "suspended" ? "Suspended" : "Active";

const toBackendStatus = (status: ClientStatus) =>
  status === "Suspended" ? "suspended" : "active";

function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [activeTab, setActiveTab] = useState<ClientTab>("All Clients");
  const [cityFilter, setCityFilter] = useState("All Cities");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingClientId, setUpdatingClientId] = useState<string | null>(null);
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    phone: "",
    city: "Karachi",
    address: "",
    status: "Active" as ClientStatus,
  });

  const loadClients = async () => {
    setLoading(true);

    try {
      const [clientResponse, userResponse, jobResponse, paymentResponse] = await Promise.all([
        apiFetch("/clients"),
        apiFetch("/users"),
        apiFetch("/jobs"),
        apiFetch("/payments"),
      ]);

      if (!clientResponse.ok || !userResponse.ok || !jobResponse.ok || !paymentResponse.ok) {
        throw new Error("Could not load client records from backend");
      }

      const [backendClients, backendUsers, backendJobs, backendPayments] = (await Promise.all([
        clientResponse.json(),
        userResponse.json(),
        jobResponse.json(),
        paymentResponse.json(),
      ])) as [BackendClient[], BackendUser[], BackendJob[], BackendPayment[]];

      const usersById = new Map(backendUsers.map((user) => [user._id, user]));

      setClients(
        backendClients.map((client, index) => {
          const user = client.user_id ? usersById.get(client.user_id) : undefined;
          const name = user?.name || `Client ${client.id ?? index + 1}`;
          const userId = client.user_id || "";
          const jobs = backendJobs.filter((job) => job.client_id === userId).length;
          const spent = backendPayments
            .filter(
              (payment) => payment.client_id === userId && payment.payment_status === "completed",
            )
            .reduce((sum, payment) => sum + (payment.amount || 0), 0);

          return {
            mongoId: client._id,
            userId,
            id: client.id ? `#CL-${String(client.id).padStart(4, "0")}` : client._id,
            name,
            email: user?.email || "No email",
            initials: makeInitials(name),
            phone: user?.phone || "No phone",
            city: client.city || "Karachi",
            address: client.address || "No address",
            jobs,
            spent: formatCurrency(spent),
            joined: formatDate(client.created_at),
            status: toClientStatus(client.status),
          };
        }),
      );
    } catch (error) {
      toast.error("Clients could not be loaded", {
        description: error instanceof Error ? error.message : "Please check the backend server.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const cities = useMemo(
    () => ["All Cities", ...Array.from(new Set([...cityOptions, ...clients.map((c) => c.city)]))],
    [clients],
  );

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesTab = activeTab === "All Clients" || client.status === activeTab;
      const matchesCity = cityFilter === "All Cities" || client.city === cityFilter;

      return matchesTab && matchesCity;
    });
  }, [activeTab, cityFilter, clients]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * pageSize;
  const pageClients = filteredClients.slice(pageStart, pageStart + pageSize);
  const selectedOnPage =
    pageClients.length > 0 && pageClients.every((client) => selectedClientIds.includes(client.id));

  useEffect(() => {
    setCurrentPage(1);
    setSelectedClientIds([]);
  }, [activeTab, cityFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds((current) =>
      current.includes(clientId) ? current.filter((id) => id !== clientId) : [...current, clientId],
    );
  };

  const togglePageSelection = () => {
    const pageIds = pageClients.map((client) => client.id);
    setSelectedClientIds((current) =>
      selectedOnPage
        ? current.filter((id) => !pageIds.includes(id))
        : Array.from(new Set([...current, ...pageIds])),
    );
  };

  const handleAddClient = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = newClient.name.trim();
    const email = newClient.email.trim();
    const phone = newClient.phone.trim();
    const address = newClient.address.trim();

    if (!name || !email || !phone || !address) {
      toast.error("Complete the client form", {
        description: "Name, email, phone, and address are required.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const registerResponse = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password: "client12345",
        }),
      });

      const registeredUser = await registerResponse.json();

      if (!registerResponse.ok) {
        throw new Error(registeredUser.error || "Client user was not created");
      }

      await apiFetch(`/users/${registeredUser._id}`, {
        method: "PUT",
        body: JSON.stringify({
          phone,
          role: "client",
        }),
      });

      const clientResponse = await apiFetch("/clients", {
        method: "POST",
        body: JSON.stringify({
          user_id: registeredUser._id,
          address,
          city: newClient.city,
          status: toBackendStatus(newClient.status),
          created_at: new Date().toISOString(),
        }),
      });

      const clientData = await clientResponse.json();

      if (!clientResponse.ok) {
        throw new Error(clientData.error || "Client profile was not saved");
      }

      await loadClients();
      setActiveTab("All Clients");
      setCityFilter("All Cities");
      setCurrentPage(1);
      setIsAddDialogOpen(false);
      setNewClient({
        name: "",
        email: "",
        phone: "",
        city: "Karachi",
        address: "",
        status: "Active",
      });
      toast.success("Client added", {
        description: `${name} has been saved in MongoDB.`,
      });
    } catch (error) {
      toast.error("Client was not added", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateClientStatus = async (client: Client, status: ClientStatus) => {
    setUpdatingClientId(client.mongoId);

    try {
      const response = await apiFetch(`/clients/${client.mongoId}`, {
        method: "PUT",
        body: JSON.stringify({ status: toBackendStatus(status) }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Client status update failed");
      }

      setClients((current) =>
        current.map((item) => (item.mongoId === client.mongoId ? { ...item, status } : item)),
      );
      toast.success(`Client marked ${status.toLowerCase()}`, {
        description: `${client.name}'s account status was updated.`,
      });
    } catch (error) {
      toast.error("Status was not updated", {
        description: error instanceof Error ? error.message : "Please restart backend if needed.",
      });
    } finally {
      setUpdatingClientId(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-surface-muted">
      <AdminSidebar active="Clients" />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar>
          <h1 className="text-2xl font-bold text-foreground">All Clients</h1>
        </AdminTopbar>

        <main className="flex-1 px-6 lg:px-10 py-6 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="inline-flex bg-card rounded-xl p-1 border border-border w-fit">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    activeTab === tab
                      ? "bg-brand text-brand-foreground"
                      : "text-foreground/70 hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:bg-surface-muted transition-colors">
                    <Filter className="size-4" />
                    {cityFilter === "All Cities" ? "Filter by City" : cityFilter}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 rounded-xl p-2">
                  {cities.map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => setCityFilter(city)}
                      className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                        cityFilter === city
                          ? "bg-brand text-brand-foreground"
                          : "text-foreground/80 hover:bg-surface-muted"
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
              <button
                type="button"
                onClick={() => setIsAddDialogOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand to-brand-light text-brand-foreground rounded-xl text-sm font-semibold shadow-[var(--shadow-brand)] hover:opacity-95 transition-opacity"
              >
                <Plus className="size-4" />
                Add New Client
              </button>
            </div>
          </div>

          {(activeTab !== "All Clients" || cityFilter !== "All Cities") && (
            <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground">
              Showing {filteredClients.length.toLocaleString()} client
              {filteredClients.length === 1 ? "" : "s"} for {activeTab}
              {cityFilter !== "All Cities" ? ` in ${cityFilter}` : ""}.
            </div>
          )}

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/50">
                    <th className="w-12 px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedOnPage}
                        onChange={togglePageSelection}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left px-2 py-4 text-[11px] font-bold tracking-wider text-muted-foreground">
                      CLIENT ID
                    </th>
                    <th className="text-left px-2 py-4 text-[11px] font-bold tracking-wider text-muted-foreground">
                      PHOTO &amp; NAME
                    </th>
                    <th className="text-left px-2 py-4 text-[11px] font-bold tracking-wider text-muted-foreground">
                      PHONE NUMBER
                    </th>
                    <th className="text-left px-2 py-4 text-[11px] font-bold tracking-wider text-muted-foreground">
                      CITY
                    </th>
                    <th className="text-left px-2 py-4 text-[11px] font-bold tracking-wider text-muted-foreground">
                      TOTAL JOBS
                    </th>
                    <th className="text-left px-2 py-4 text-[11px] font-bold tracking-wider text-muted-foreground">
                      TOTAL SPENT
                    </th>
                    <th className="text-left px-2 py-4 text-[11px] font-bold tracking-wider text-muted-foreground">
                      JOINED DATE
                    </th>
                    <th className="text-left px-2 py-4 text-[11px] font-bold tracking-wider text-muted-foreground">
                      STATUS
                    </th>
                    <th className="text-left px-2 py-4 text-[11px] font-bold tracking-wider text-muted-foreground">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={10} className="px-6 py-10 text-center text-muted-foreground">
                        Loading clients from backend...
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    pageClients.map((client) => (
                      <tr
                        key={client.mongoId}
                        className="border-b border-border last:border-0 hover:bg-surface-muted/40 transition-colors"
                      >
                        <td className="px-4 py-5">
                          <input
                            type="checkbox"
                            checked={selectedClientIds.includes(client.id)}
                            onChange={() => toggleClientSelection(client.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-2 py-5 text-sm text-muted-foreground">{client.id}</td>
                        <td className="px-2 py-5 min-w-56">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full bg-gradient-to-br from-brand/30 to-brand-light/30 flex items-center justify-center text-foreground font-bold text-xs">
                              {client.initials}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-foreground">{client.name}</p>
                              <p className="text-xs text-muted-foreground">{client.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-5 text-sm text-foreground/80">{client.phone}</td>
                        <td className="px-2 py-5 text-sm text-foreground/80">{client.city}</td>
                        <td className="px-2 py-5 text-sm text-foreground/80">{client.jobs} Jobs</td>
                        <td className="px-2 py-5 text-sm font-bold text-brand">{client.spent}</td>
                        <td className="px-2 py-5 text-sm text-foreground/80">{client.joined}</td>
                        <td className="px-2 py-5">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-[11px] font-bold tracking-wide ${
                              client.status === "Active"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {client.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-2 py-5">
                          <button
                            type="button"
                            disabled={updatingClientId === client.mongoId}
                            onClick={() =>
                              updateClientStatus(
                                client,
                                client.status === "Active" ? "Suspended" : "Active",
                              )
                            }
                            className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {client.status === "Active" ? "Suspend" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}

                  {!loading && pageClients.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-6 py-10 text-center text-muted-foreground">
                        No clients match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Showing {filteredClients.length === 0 ? 0 : pageStart + 1} -{" "}
                {Math.min(pageStart + pageSize, filteredClients.length)} of{" "}
                {filteredClients.length.toLocaleString()} clients
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage === 1}
                  className="size-9 rounded-lg border border-border flex items-center justify-center hover:bg-surface-muted transition-colors disabled:cursor-not-allowed disabled:opacity-40"
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
                          ? "bg-brand text-brand-foreground"
                          : "hover:bg-surface-muted"
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
                          ? "bg-brand text-brand-foreground"
                          : "hover:bg-surface-muted"
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
                  className="size-9 rounded-lg border border-border flex items-center justify-center hover:bg-surface-muted transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl p-8 text-brand-foreground bg-gradient-to-br from-brand to-brand-light shadow-[var(--shadow-brand)]">
              <p className="text-sm font-semibold opacity-90">Growth Analytics</p>
              <h2 className="text-3xl font-bold mt-2">{clients.length} Registered Clients</h2>
              <p className="mt-3 text-sm opacity-90 max-w-xl">
                This table is now backed by MongoDB clients, users, jobs, and payment records.
              </p>
            </div>

            <div className="bg-card rounded-2xl border border-border p-6">
              <p className="text-[11px] font-bold tracking-widest text-muted-foreground">
                CLIENT SNAPSHOT
              </p>
              <div className="mt-5 space-y-4">
                <SummaryRow label="Active" value={clients.filter((c) => c.status === "Active").length} />
                <SummaryRow
                  label="Suspended"
                  value={clients.filter((c) => c.status === "Suspended").length}
                />
                <SummaryRow label="Total Jobs" value={clients.reduce((sum, c) => sum + c.jobs, 0)} />
              </div>
            </div>
          </div>
        </main>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>Create a client user and profile in MongoDB.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddClient} className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <input
                value={newClient.name}
                onChange={(event) =>
                  setNewClient((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Client name"
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:border-brand"
              />
              <input
                value={newClient.email}
                onChange={(event) =>
                  setNewClient((current) => ({ ...current, email: event.target.value }))
                }
                type="email"
                placeholder="Email"
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:border-brand"
              />
              <input
                value={newClient.phone}
                onChange={(event) =>
                  setNewClient((current) => ({ ...current, phone: event.target.value }))
                }
                placeholder="Phone number"
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:border-brand"
              />
              <input
                value={newClient.address}
                onChange={(event) =>
                  setNewClient((current) => ({ ...current, address: event.target.value }))
                }
                placeholder="Address"
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:border-brand"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={newClient.city}
                  onChange={(event) =>
                    setNewClient((current) => ({ ...current, city: event.target.value }))
                  }
                  className="h-11 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:border-brand"
                >
                  {cityOptions.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                <select
                  value={newClient.status}
                  onChange={(event) =>
                    setNewClient((current) => ({
                      ...current,
                      status: event.target.value as ClientStatus,
                    }))
                  }
                  className="h-11 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:border-brand"
                >
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAddDialogOpen(false)}
                className="h-10 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-surface-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Add Client"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-surface-muted px-4 py-3">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <span className="text-sm font-bold text-brand">{value}</span>
    </div>
  );
}

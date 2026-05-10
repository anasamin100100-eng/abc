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

interface Client {
  id: string;
  name: string;
  email: string;
  initials: string;
  phone: string;
  city: string;
  jobs: number;
  spent: string;
  joined: string;
  status: ClientStatus;
}

const pageSize = 4;
const tabs: ClientTab[] = ["All Clients", "Active", "Suspended"];
const cities = ["All Cities", "Karachi", "Lahore", "Islamabad", "Rawalpindi"] as const;

const clientSeed: Client[] = [
  {
    id: "#CL-8821",
    name: "Zara Malik",
    email: "zara.malik@email.pk",
    initials: "ZM",
    phone: "+92 300 4567891",
    city: "Karachi",
    jobs: 14,
    spent: "Rs. 45,200",
    joined: "12/05/2023",
    status: "Active",
  },
  {
    id: "#CL-7740",
    name: "Ahmed Khan",
    email: "ahmed.khan@outlook.pk",
    initials: "AK",
    phone: "+92 321 9876543",
    city: "Lahore",
    jobs: 8,
    spent: "Rs. 28,150",
    joined: "24/11/2023",
    status: "Active",
  },
  {
    id: "#CL-6215",
    name: "Fatima Ali",
    email: "fatima.ali@gmail.com",
    initials: "FA",
    phone: "+92 333 1234567",
    city: "Karachi",
    jobs: 2,
    spent: "Rs. 4,500",
    joined: "05/01/2024",
    status: "Suspended",
  },
  {
    id: "#CL-5509",
    name: "Usman Malik",
    email: "u.malik@corp.pk",
    initials: "UM",
    phone: "+92 345 6677889",
    city: "Islamabad",
    jobs: 21,
    spent: "Rs. 89,300",
    joined: "15/08/2022",
    status: "Active",
  },
];

const makeInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const allSeedClients: Client[] = Array.from({ length: 248 }, (_, index) => {
  const seed = clientSeed[index % clientSeed.length];
  const serial = index + 1;
  const city = cities[(index % (cities.length - 1)) + 1];
  const status: ClientStatus = index % 7 === 2 ? "Suspended" : "Active";

  return {
    ...seed,
    id: `#CL-${String(5000 + serial).padStart(4, "0")}`,
    email: seed.email.replace("@", `+${serial}@`),
    city,
    status,
    jobs: seed.jobs + (index % 18),
    spent: `Rs. ${(4500 + (index + 1) * 725).toLocaleString()}`,
  };
});

function ClientsPage() {
  const [clients, setClients] = useState<Client[]>(allSeedClients);
  const [activeTab, setActiveTab] = useState<ClientTab>("All Clients");
  const [cityFilter, setCityFilter] = useState<(typeof cities)[number]>("All Cities");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    phone: "",
    city: "Karachi",
    status: "Active" as ClientStatus,
  });

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

  const handleAddClient = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = newClient.name.trim();
    if (!trimmedName || !newClient.email.trim() || !newClient.phone.trim()) {
      toast.error("Complete the client form", {
        description: "Name, email, and phone are required.",
      });
      return;
    }

    const client: Client = {
      id: `#CL-${String(5000 + clients.length + 1).padStart(4, "0")}`,
      name: trimmedName,
      email: newClient.email.trim(),
      initials: makeInitials(trimmedName),
      phone: newClient.phone.trim(),
      city: newClient.city,
      jobs: 0,
      spent: "Rs. 0",
      joined: new Date().toLocaleDateString("en-GB"),
      status: newClient.status,
    };

    setClients((current) => [client, ...current]);
    setActiveTab("All Clients");
    setCityFilter("All Cities");
    setCurrentPage(1);
    setIsAddDialogOpen(false);
    setNewClient({
      name: "",
      email: "",
      phone: "",
      city: "Karachi",
      status: "Active",
    });
    toast.success("Client added", {
      description: `${client.name} is now visible in the clients table.`,
    });
  };

  return (
    <div className="flex min-h-screen bg-surface-muted">
      <AdminSidebar active="Clients" />
      <div className="flex-1 flex flex-col">
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
                  </tr>
                </thead>
                <tbody>
                  {pageClients.map((client) => (
                    <tr
                      key={client.id}
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
                      <td className="px-2 py-5">
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
                    </tr>
                  ))}
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
                {[1, 2, 3].map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(Math.min(page, totalPages))}
                    disabled={page > totalPages}
                    className={`size-9 rounded-lg text-sm font-semibold transition-colors ${
                      safeCurrentPage === page
                        ? "bg-brand text-brand-foreground"
                        : "hover:bg-surface-muted"
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    {page}
                  </button>
                ))}
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
              <h2 className="text-3xl font-bold mt-2">+24% New Registrations</h2>
              <p className="mt-3 text-sm opacity-90 max-w-xl">
                The Karachi region is seeing an unprecedented 40% uptick in client engagement this
                quarter.
              </p>
              <div className="mt-8 flex gap-4">
                <div className="bg-white/15 backdrop-blur rounded-xl px-5 py-3">
                  <p className="text-[10px] font-bold tracking-widest opacity-80">TOP REGION</p>
                  <p className="font-bold mt-1">Karachi East</p>
                </div>
                <div className="bg-white/15 backdrop-blur rounded-xl px-5 py-3">
                  <p className="text-[10px] font-bold tracking-widest opacity-80">AVG. RETENTION</p>
                  <p className="font-bold mt-1">8.4 Months</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-6">
              <p className="text-[11px] font-bold tracking-widest text-muted-foreground">
                RECENT ACTIVITY
              </p>
              <ul className="mt-5 space-y-5">
                {[
                  {
                    color: "bg-brand",
                    title: "New client onboarded",
                    desc: "Zara Malik joined from Karachi",
                    time: "2 MINS AGO",
                  },
                  {
                    color: "bg-amber-400",
                    title: "Status update",
                    desc: "Fatima Ali marked as Suspended",
                    time: "1 HOUR AGO",
                  },
                  {
                    color: "bg-emerald-500",
                    title: "Payment received",
                    desc: "Rs. 12,500 from Usman Malik",
                    time: "4 HOURS AGO",
                  },
                ].map((activity) => (
                  <li key={activity.title} className="flex gap-3">
                    <div className={`size-2.5 rounded-full mt-1.5 shrink-0 ${activity.color}`} />
                    <div>
                      <p className="font-semibold text-sm text-foreground">{activity.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{activity.desc}</p>
                      <p className="text-[10px] font-bold tracking-widest text-brand mt-1">
                        {activity.time}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </main>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>Create a client record for the admin table.</DialogDescription>
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
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={newClient.city}
                  onChange={(event) =>
                    setNewClient((current) => ({ ...current, city: event.target.value }))
                  }
                  className="h-11 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:border-brand"
                >
                  {cities
                    .filter((city) => city !== "All Cities")
                    .map((city) => (
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
                className="h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground hover:bg-brand-light"
              >
                Add Client
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

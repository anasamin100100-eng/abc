import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Users } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { apiFetch } from "@/utils/api";

export const Route = createFileRoute("/users")({
  component: UsersPage,
  head: () => ({ meta: [{ title: "All Users - UstadGo Admin" }] }),
});

type User = {
  _id: string;
  id?: number;
  name?: string;
  email?: string;
  phone?: string;
  role?: "admin" | "worker" | "client";
  created_at?: string;
};

const roles = ["all", "admin", "worker", "client"] as const;

function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [role, setRole] = useState<(typeof roles)[number]>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      try {
        const response = await apiFetch("/users");
        if (!response.ok) throw new Error("Could not load users");
        setUsers((await response.json()) as User[]);
      } catch (error) {
        toast.error("Users could not be loaded", {
          description: error instanceof Error ? error.message : "Please check backend/login.",
        });
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesRole = role === "all" || user.role === role;
      const matchesSearch =
        !normalizedSearch ||
        [user.name, user.email, user.phone, user.role, String(user.id || "")]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));
      return matchesRole && matchesSearch;
    });
  }, [normalizedSearch, role, users]);

  return (
    <div className="min-h-screen bg-surface-muted flex">
      <AdminSidebar active="All Users" />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search users..."
              className="w-full bg-surface-muted border border-border rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
        </AdminTopbar>

        <main className="flex-1 px-6 lg:px-10 py-8 space-y-6">
          <div>
            <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Users className="size-6" />
            </div>
            <h1 className="mt-4 text-3xl font-bold">All Users</h1>
            <p className="mt-1 text-muted-foreground">Users are loaded from MongoDB.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {roles.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRole(item)}
                className={`rounded-2xl border px-4 py-4 text-left capitalize ${
                  role === item
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border bg-background hover:bg-surface-muted"
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest">{item}</p>
                <p className="mt-2 text-2xl font-bold">
                  {item === "all" ? users.length : users.filter((u) => u.role === item).length}
                </p>
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-border bg-background overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-4 text-left">ID</th>
                    <th className="px-4 py-4 text-left">Name</th>
                    <th className="px-4 py-4 text-left">Email</th>
                    <th className="px-4 py-4 text-left">Phone</th>
                    <th className="px-4 py-4 text-left">Role</th>
                    <th className="px-5 py-4 text-left">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                        Loading users from backend...
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    filteredUsers.map((user) => (
                      <tr key={user._id} className="border-t border-border">
                        <td className="px-5 py-4 text-muted-foreground">
                          {user.id ? `#USR-${String(user.id).padStart(4, "0")}` : user._id}
                        </td>
                        <td className="px-4 py-4 font-bold">{user.name || "Unnamed User"}</td>
                        <td className="px-4 py-4">{user.email || "No email"}</td>
                        <td className="px-4 py-4">{user.phone || "No phone"}</td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-brand/10 px-3 py-1 text-[11px] font-bold uppercase text-brand">
                            {user.role || "client"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString("en-GB")
                            : "Not available"}
                        </td>
                      </tr>
                    ))}
                  {!loading && filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                        No users match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

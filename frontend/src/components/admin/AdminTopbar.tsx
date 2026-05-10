import { Bell, HelpCircle, LogOut, Settings, UserRound } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface AdminTopbarProps {
  name?: string;
  role?: string;
  initials?: string;
  children?: React.ReactNode;
}

export function AdminTopbar({
  name = "Ahmed Khan",
  role = "SUPER ADMIN",
  initials = "AK",
  children,
}: AdminTopbarProps) {
  const navigate = useNavigate();

  const handleSignOut = () => {
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-6 lg:px-10 py-4 flex items-center gap-4">
      <div className="flex-1">{children}</div>
      <Popover>
        <PopoverTrigger asChild>
          <button
            aria-label="View notifications"
            className="relative size-10 rounded-full hover:bg-surface-muted flex items-center justify-center text-foreground/70 transition-colors"
          >
            <Bell className="size-5" />
            <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-orange-500 ring-2 ring-background" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 rounded-xl p-0">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-bold text-foreground">Notifications</p>
            <p className="text-xs text-muted-foreground">Latest admin activity</p>
          </div>
          <div className="divide-y divide-border">
            {[
              "2 worker profiles are waiting for verification.",
              "3 new job requests were created in Karachi.",
              "Weekly performance report is ready to export.",
            ].map((item) => (
              <div key={item} className="px-4 py-3 text-sm text-foreground/80">
                {item}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <button
            aria-label="Open help"
            className="size-10 rounded-full hover:bg-surface-muted flex items-center justify-center text-foreground/70 transition-colors"
          >
            <HelpCircle className="size-5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 rounded-xl">
          <p className="text-sm font-bold text-foreground">Help Center</p>
          <div className="mt-3 space-y-3 text-sm text-foreground/80">
            <button
              type="button"
              onClick={() => navigate({ to: "/active-jobs" })}
              className="block w-full rounded-lg border border-border px-3 py-2 text-left hover:bg-surface-muted"
            >
              Review live job status
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/workers" })}
              className="block w-full rounded-lg border border-border px-3 py-2 text-left hover:bg-surface-muted"
            >
              Manage worker verification
            </button>
            <a
              href="mailto:support@ustadgo.pk"
              className="block rounded-lg border border-border px-3 py-2 hover:bg-surface-muted"
            >
              Contact support
            </a>
          </div>
        </PopoverContent>
      </Popover>
      <div className="flex items-center gap-3 pl-2">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-foreground leading-tight">{name}</p>
          <p className="text-[10px] tracking-widest text-muted-foreground">{role}</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Open account menu"
              className="size-10 rounded-full bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-brand-foreground font-bold text-sm ring-offset-background transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
            >
              {initials}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 rounded-xl p-0">
            <div className="border-b border-border px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-full bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-brand-foreground font-bold text-sm">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{name}</p>
                  <p className="text-[10px] tracking-widest text-muted-foreground">{role}</p>
                </div>
              </div>
            </div>
            <div className="p-2 text-sm">
              <button
                type="button"
                onClick={() => navigate({ to: "/settings" })}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-foreground/80 hover:bg-surface-muted"
              >
                <UserRound className="size-4" />
                Profile
              </button>
              <button
                type="button"
                onClick={() => navigate({ to: "/settings" })}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-foreground/80 hover:bg-surface-muted"
              >
                <Settings className="size-4" />
                Account settings
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-destructive hover:bg-destructive/10"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-semibold text-foreground/80 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
      >
        <LogOut className="size-4" />
        <span className="hidden sm:inline">Sign Out</span>
      </button>
    </header>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Wrench, MapPin, Eye, EyeOff, Shield } from "lucide-react";

export const Route = createFileRoute("/")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "UstadGo Admin — Sign In" },
      {
        name: "description",
        content:
          "Sign in to UstadGo Admin: the architectural ledger for Pakistan's premier vocational and technical education network.",
      },
    ],
  }),
});

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const navigate = useNavigate();

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left: Brand panel */}
      <aside
        className="relative hidden lg:flex flex-col justify-between p-12 text-brand-foreground overflow-hidden"
        style={{ background: "var(--gradient-brand-soft)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.15] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative flex justify-end">
          <div className="text-right">
            <p className="text-[10px] font-semibold tracking-[0.2em] opacity-80">
              SERVER
            </p>
            <p className="text-[10px] tracking-widest opacity-70 flex items-center gap-1.5 justify-end mt-1">
              PK-ISB-01
              <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.7)]" />
            </p>
          </div>
        </div>

        <div className="relative">
          <div className="size-20 rounded-3xl bg-background shadow-2xl flex items-center justify-center mb-8">
            <Wrench className="size-9 text-brand" strokeWidth={2.5} />
          </div>
          <h1 className="text-5xl font-bold leading-[1.1] tracking-tight mb-5">
            UstadGo Admin:
            <br />
            Manage the Hustle
          </h1>
          <p className="text-lg opacity-90 max-w-md leading-relaxed">
            The Architectural Ledger for Pakistan's premier vocational and
            technical education network.
          </p>

          <div className="mt-12 flex items-center gap-3 max-w-sm">
            <div className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden">
              <div className="h-full w-1/3 bg-white rounded-full" />
            </div>
            <MapPin className="size-5 fill-emerald-700 text-emerald-700" />
          </div>
        </div>

        <div className="relative text-[11px] tracking-[0.2em] opacity-60 space-y-1">
          <p>SYSTEM VERSION 4.2.0-ALPHA</p>
          <p>REGION: ISLAMABAD CENTRAL</p>
        </div>
      </aside>

      {/* Right: Form panel */}
      <section className="flex flex-col justify-center px-6 sm:px-16 lg:px-24 py-16 relative">
        <div className="w-full max-w-md mx-auto">
          <h2 className="text-4xl font-bold tracking-tight text-foreground">
            Welcome Back
          </h2>
          <p className="mt-3 text-foreground/70">
            Please enter your administrative credentials to continue.
          </p>

          <form
            className="mt-10 space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/dashboard" });
            }}
          >
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-xs font-bold tracking-widest text-foreground/80"
              >
                EMAIL ADDRESS
              </label>
              <input
                id="email"
                type="email"
                placeholder="admin@ustadgo.pk"
                className="w-full h-14 px-5 rounded-xl bg-surface-muted border border-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-brand focus:bg-background transition-all"
                style={{ boxShadow: "var(--shadow-input)" }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-bold tracking-widest text-foreground/80"
                >
                  PASSWORD
                </label>
                <a
                  href="#"
                  className="text-sm font-semibold text-brand hover:text-brand-light transition-colors"
                >
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  className="w-full h-14 px-5 pr-14 rounded-xl bg-surface-muted border border-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-brand focus:bg-background transition-all"
                  style={{ boxShadow: "var(--shadow-input)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer select-none group">
              <span className="relative">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="block size-5 rounded-md border-2 border-border peer-checked:bg-brand peer-checked:border-brand transition-colors" />
                {remember && (
                  <svg
                    className="absolute inset-0 m-auto size-3.5 text-brand-foreground pointer-events-none"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="text-sm text-foreground/80">
                Remember this device for 30 days
              </span>
            </label>

            <button
              type="submit"
              className="w-full h-14 rounded-full font-bold tracking-[0.15em] text-sm text-brand-foreground transition-transform hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: "var(--gradient-brand)",
                boxShadow: "var(--shadow-brand)",
              }}
            >
              SIGN IN TO PORTAL
            </button>

            <div className="flex justify-center pt-2">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface-muted text-xs font-semibold tracking-[0.15em] text-foreground/70">
                <Shield className="size-4 text-brand" fill="currentColor" />
                PROTECTED BY USTADGO SECURITY
              </div>
            </div>
          </form>

          <footer className="mt-16 flex items-center justify-between text-[11px] font-semibold tracking-[0.18em] text-muted-foreground/70">
            <a href="#" className="hover:text-foreground transition-colors">
              PRIVACY PROTOCOL
            </a>
            <div className="flex items-center gap-3">
              <a href="#" className="hover:text-foreground transition-colors">
                SYSTEM STATUS
              </a>
              <span className="size-1 rounded-full bg-muted-foreground/50" />
              <a href="#" className="hover:text-foreground transition-colors">
                SUPPORT
              </a>
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}

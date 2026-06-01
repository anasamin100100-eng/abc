import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async () => {
    setIsSubmitting(true);

    try {
      await login(email, password);
      toast.success("Admin signed in", {
        description: "Your session will expire in 5 minutes.",
      });
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error("Login failed", {
        description: error instanceof Error ? error.message : "Please check your credentials.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-surface-muted">
      <Card className="w-full max-w-md p-6">
        <CardContent className="space-y-4">
          <h1 className="text-2xl font-bold text-center">Admin Login</h1>

          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />

          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button className="w-full" onClick={handleLogin} disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Login"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Admin-only access. Sessions expire after 5 minutes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

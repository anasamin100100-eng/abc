import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const login = () => {
  navigate({ to: "/dashboard" });
};


  return (
    <div className="flex items-center justify-center min-h-screen bg-surface-muted">
      <Card className="w-full max-w-md p-6">
        <CardContent className="space-y-4">
          <h1 className="text-2xl font-bold text-center">Admin Login</h1>

          <Input
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            type="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button className="w-full" onClick={login}>
            Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

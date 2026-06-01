/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { jwtDecode } from "jwt-decode";
import { apiFetch } from "@/utils/api";

interface User {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: string;
}

interface JwtPayload {
  exp?: number;
  id: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  expiresAt: number | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!token && !!user && !!expiresAt && expiresAt > Date.now();

  const clearSession = useCallback(() => {
    setUser(null);
    setToken(null);
    setExpiresAt(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("tokenExpiresAt");
  }, []);

  const saveSession = useCallback(
    (nextToken: string, nextUser: User) => {
      const decoded = jwtDecode<JwtPayload>(nextToken);
      const nextExpiresAt = decoded.exp ? decoded.exp * 1000 : Date.now() + 5 * 60 * 1000;

      if (nextUser.role !== "admin" || decoded.role !== "admin" || nextExpiresAt <= Date.now()) {
        clearSession();
        throw new Error("Only active admin sessions can access this portal");
      }

      setToken(nextToken);
      setUser(nextUser);
      setExpiresAt(nextExpiresAt);
      localStorage.setItem("token", nextToken);
      localStorage.setItem("user", JSON.stringify(nextUser));
      localStorage.setItem("tokenExpiresAt", String(nextExpiresAt));
    },
    [clearSession],
  );

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      try {
        saveSession(storedToken, JSON.parse(storedUser) as User);
      } catch {
        clearSession();
      }
    }
    setLoading(false);
  }, [clearSession, saveSession]);

  useEffect(() => {
    if (!expiresAt) return;

    const timeout = window.setTimeout(
      () => {
        clearSession();
      },
      Math.max(expiresAt - Date.now(), 0),
    );

    return () => window.clearTimeout(timeout);
  }, [clearSession, expiresAt]);

  const login = async (email: string, password: string) => {
    const response = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.msg || data.error || "Login failed");
    }

    saveSession(data.token, data.user);
  };

  const logout = () => {
    clearSession();
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    expiresAt,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;

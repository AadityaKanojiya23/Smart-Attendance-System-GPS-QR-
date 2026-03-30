import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiRequest, getApiUrl } from "@/lib/query-client";

export type UserRole = "admin" | "teacher" | "student";

export interface TeacherAssignment {
  className: string;
  departmentId: string;
  departmentCode: string;
  year: number;
  division: string;
  subjects: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  className?: string;
  department?: string;
  departmentId?: string;
  year?: number;
  division?: string;
  subjects?: string[];
  assignments?: TeacherAssignment[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const url = getApiUrl("/auth/me");
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refetch().finally(() => setLoading(false));
  }, [refetch]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiRequest<{ user: User }>("POST", "/auth/login", {
      email,
      password,
    });
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await apiRequest("POST", "/auth/logout", {});
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

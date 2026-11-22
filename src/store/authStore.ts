import { create } from "zustand";
import api from "@/lib/axios";

// The shape /api/auth/me returns (a User document, so `_id`, not `id`).
export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sidebarOpen: boolean;
  setSession: (user: User, tokens: SessionTokens) => void;
  logout: () => Promise<void>;
  setSidebarOpen: (open: boolean) => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  sidebarOpen: true,

  // Stores a session the server has already issued (e.g. after OTP verify).
  setSession: (user, { accessToken, refreshToken }) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    set({ user, accessToken, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    // Revoke the tokens server-side, but log out locally even if that fails.
    try {
      await api.post("/api/auth/logout", null, { timeout: 5000 });
    } catch {
      // ignore
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
    window.location.href = "/admin/login";
  },

  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

  initialize: async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const res = await api.get<{ data: User }>("/api/auth/me");
      const user = res.data.data;
      set({ user, accessToken: token, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      set({ isLoading: false });
    }
  },
}));

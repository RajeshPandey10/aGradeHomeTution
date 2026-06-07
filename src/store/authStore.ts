import { create } from "zustand";
import api from "@/lib/axios";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sidebarOpen: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setSidebarOpen: (open: boolean) => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  sidebarOpen: true,

  login: async (email: string, password: string) => {
    const res = await api.post("/api/admin/login", { email, password });
    const { user, accessToken, refreshToken } = res.data.data;
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    set({ user, accessToken, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
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
      const res = await api.get("/api/auth/me");
      const user = res.data.data;
      set({ user, accessToken: token, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      set({ isLoading: false });
    }
  },
}));

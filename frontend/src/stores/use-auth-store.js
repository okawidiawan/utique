import { create } from "zustand";
import api from "../lib/api";

// ==========================================
// Auth Store — State management untuk autentikasi pengguna
// Mengelola: login, register, logout, dan cek status login.
// Token disimpan di localStorage agar persist saat refresh.
// ==========================================
const useAuthStore = create((set) => ({
  // State
  user: null,
  token: localStorage.getItem("token") || null,
  isLoading: false,
  error: null,

  // Simpan data user dan token setelah login/register berhasil
  setAuth: (user, token) => {
    localStorage.setItem("token", token);
    set({ user, token, error: null });
  },

  // Hapus data autentikasi (logout)
  clearAuth: () => {
    localStorage.removeItem("token");
    set({ user: null, token: null, error: null });
  },

  // Set error message
  setError: (error) => set({ error }),

  // Set loading state
  setLoading: (isLoading) => set({ isLoading }),

  // Cek apakah user sudah login (ambil profil dari API)
  fetchUser: async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      set({ isLoading: true });
      const response = await api.get("/users/current");
      set({ user: response.data.data, isLoading: false });
    } catch (error) {
      // Token invalid, hapus
      localStorage.removeItem("token");
      set({ user: null, token: null, isLoading: false });
    }
  },
}));

export default useAuthStore;

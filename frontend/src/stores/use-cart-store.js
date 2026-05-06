import { create } from "zustand";
import api from "../lib/api";

// ==========================================
// Cart Store — State management untuk keranjang belanja
// Mengelola: fetch, tambah, ubah quantity, dan hapus item dari cart.
// ==========================================
const useCartStore = create((set, get) => ({
  // State
  items: [],
  isLoading: false,
  error: null,

  // Ambil isi keranjang dari API
  fetchCart: async () => {
    try {
      set({ isLoading: true });
      const response = await api.get("/cart");
      set({ items: response.data.data.items || [], isLoading: false });
    } catch (error) {
      set({ error: error.response?.data?.error, isLoading: false });
    }
  },

  // Hitung total item di keranjang
  getTotalItems: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },

  // Hitung total harga
  getTotalPrice: () => {
    return get().items.reduce(
      (sum, item) => sum + item.quantity * item.productVariant.price,
      0
    );
  },

  // Reset cart state
  clearCart: () => set({ items: [], error: null }),
}));

export default useCartStore;

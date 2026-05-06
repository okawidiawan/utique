import express from "express";
import { authMiddleware } from "../middleware/auth-middleware.js";
import { adminMiddleware } from "../middleware/admin-middleware.js";

export const adminRouter = express.Router();

// Semua route di bawah ini membutuhkan autentikasi + role ADMIN
adminRouter.use(authMiddleware);
adminRouter.use(adminMiddleware);

// ==========================================
// Flavor & Size Routes
// ==========================================
// TODO: POST /api/admin/flavors — Tambah rasa
// TODO: GET /api/admin/flavors — List rasa
// TODO: POST /api/admin/sizes — Tambah ukuran
// TODO: GET /api/admin/sizes — List ukuran

// ==========================================
// Product Routes (Admin)
// ==========================================
// TODO: POST /api/admin/products — Tambah produk
// TODO: PATCH /api/admin/products/:id — Update produk
// TODO: DELETE /api/admin/products/:id — Hapus produk

// ==========================================
// Variant Routes
// ==========================================
// TODO: POST /api/admin/products/:id/variants — Tambah varian
// TODO: PATCH /api/admin/variants/:id — Update varian
// TODO: DELETE /api/admin/variants/:id — Hapus varian

// ==========================================
// Order Management Routes
// ==========================================
// TODO: GET /api/admin/orders — List semua order
// TODO: GET /api/admin/orders/:id — Detail order
// TODO: PATCH /api/admin/orders/:id/status — Update status order
// TODO: PATCH /api/admin/orders/:id/shipping — Input resi
// TODO: PATCH /api/admin/orders/:id/estimation — Override estimasi

// ==========================================
// Payment Verification Routes
// ==========================================
// TODO: PATCH /api/admin/payments/:id/verify — Verifikasi pembayaran
// TODO: PATCH /api/admin/payments/:id/reject — Tolak pembayaran

// ==========================================
// Dashboard & Statistics Routes (Fase 2)
// ==========================================
// TODO: GET /api/admin/dashboard — Ringkasan hari ini
// TODO: GET /api/admin/statistics — Statistik penjualan

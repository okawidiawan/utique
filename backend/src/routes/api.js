import express from "express";
import { authMiddleware } from "../middleware/auth-middleware.js";

export const apiRouter = express.Router();

// Semua route di bawah ini membutuhkan autentikasi
apiRouter.use(authMiddleware);

// ==========================================
// User Routes (Authorized)
// ==========================================
// TODO: GET /api/users/current — Profil user
// TODO: PATCH /api/users/current — Update profil
// TODO: DELETE /api/users/logout — Logout

// ==========================================
// Address Routes
// ==========================================
// TODO: POST /api/addresses — Tambah alamat
// TODO: GET /api/addresses — List alamat
// TODO: PATCH /api/addresses/:id — Update alamat
// TODO: DELETE /api/addresses/:id — Hapus alamat

// ==========================================
// Cart Routes
// ==========================================
// TODO: GET /api/cart — Isi keranjang
// TODO: POST /api/cart/items — Tambah item
// TODO: PATCH /api/cart/items/:id — Ubah quantity
// TODO: DELETE /api/cart/items/:id — Hapus item

// ==========================================
// Order Routes
// ==========================================
// TODO: POST /api/orders — Checkout
// TODO: GET /api/orders — List pesanan
// TODO: GET /api/orders/:id — Detail pesanan

// ==========================================
// Payment Routes
// ==========================================
// TODO: POST /api/orders/:orderId/payment — Upload bukti bayar

// ==========================================
// Review Routes
// ==========================================
// TODO: POST /api/products/:productId/reviews — Tambah review

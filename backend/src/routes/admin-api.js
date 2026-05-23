import express from "express";
import { authMiddleware } from "../middleware/auth-middleware.js";
import { adminMiddleware } from "../middleware/admin-middleware.js";

import flavorController from "../controller/flavor-controller.js";
import sizeController from "../controller/size-controller.js";
import productController from "../controller/product-controller.js";
import variantController from "../controller/variant-controller.js";

export const adminRouter = express.Router();

// Semua route di bawah ini membutuhkan autentikasi + role ADMIN
adminRouter.use(authMiddleware);
adminRouter.use(adminMiddleware);

// ==========================================
// Flavor & Size Routes
// ==========================================
adminRouter.post("/api/admin/flavors", flavorController.create);
adminRouter.get("/api/admin/flavors", flavorController.list);
adminRouter.post("/api/admin/sizes", sizeController.create);
adminRouter.get("/api/admin/sizes", sizeController.list);

// ==========================================
// Product Routes (Admin)
// ==========================================
adminRouter.post("/api/admin/products", productController.create);
adminRouter.patch("/api/admin/products/:id", productController.update);
adminRouter.delete("/api/admin/products/:id", productController.remove);

// ==========================================
// Variant Routes
// ==========================================
adminRouter.post("/api/admin/products/:id/variants", variantController.create);
adminRouter.patch("/api/admin/variants/:id", variantController.update);
adminRouter.delete("/api/admin/variants/:id", variantController.remove);

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

import express from "express";
import { authMiddleware } from "../middleware/auth-middleware.js";
import { adminMiddleware } from "../middleware/admin-middleware.js";

import masterAdminController from "../controller/master-admin-controller.js";
import productAdminController from "../controller/product-admin-controller.js";
import paymentAdminController from "../controller/payment-admin-controller.js";
import adminOrderController from "../controller/admin-order-controller.js";

export const adminRouter = express.Router();

// Semua route di bawah ini membutuhkan autentikasi + role ADMIN
adminRouter.use(authMiddleware);
adminRouter.use(adminMiddleware);

// ==========================================
// Flavor & Size Routes
// ==========================================
adminRouter.post("/api/admin/flavors", masterAdminController.createFlavor);
adminRouter.get("/api/admin/flavors", masterAdminController.listFlavor);
adminRouter.post("/api/admin/sizes", masterAdminController.createSize);
adminRouter.get("/api/admin/sizes", masterAdminController.listSize);

// ==========================================
// Product Routes (Admin)
// ==========================================
adminRouter.post("/api/admin/products", productAdminController.create);
adminRouter.patch("/api/admin/products/:id", productAdminController.update);
adminRouter.delete("/api/admin/products/:id", productAdminController.remove);

// ==========================================
// Variant Routes
// ==========================================
adminRouter.post("/api/admin/products/:id/variants", productAdminController.createVariant);
adminRouter.patch("/api/admin/variants/:id", productAdminController.updateVariant);
adminRouter.delete("/api/admin/variants/:id", productAdminController.removeVariant);

// ==========================================
// Order Management Routes
// ==========================================
adminRouter.get("/api/admin/orders", adminOrderController.getAll);
adminRouter.get("/api/admin/orders/:id", adminOrderController.getById);
adminRouter.patch("/api/admin/orders/:id/status", adminOrderController.updateStatus);
adminRouter.patch("/api/admin/orders/:id/shipping", adminOrderController.updateShipping);
adminRouter.patch("/api/admin/orders/:id/estimation", adminOrderController.updateEstimation);

// ==========================================
// Payment Verification Routes
// ==========================================
adminRouter.patch("/api/admin/payments/:id/verify", paymentAdminController.verify);
adminRouter.patch("/api/admin/payments/:id/reject", paymentAdminController.reject);

// ==========================================
// Dashboard & Statistics Routes (Fase 2)
// ==========================================
// TODO: GET /api/admin/dashboard — Ringkasan hari ini
// TODO: GET /api/admin/statistics — Statistik penjualan

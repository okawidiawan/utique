import express from "express";
import { authMiddleware } from "../middleware/auth-middleware.js";
import userController from "../controller/user-controller.js";
import cartController from "../controller/cart-controller.js";

export const apiRouter = express.Router();

// Semua route di bawah ini membutuhkan autentikasi
apiRouter.use(authMiddleware);

// ==========================================
// User Routes (Authorized)
// ==========================================
apiRouter.get("/api/users/current", userController.get);
apiRouter.patch("/api/users/current", userController.update);
apiRouter.delete("/api/users/logout", userController.logout);

// ==========================================
// Address Routes
// ==========================================
apiRouter.post("/api/addresses", userController.createAddress);
apiRouter.get("/api/addresses", userController.listAddresses);
apiRouter.patch("/api/addresses/:id", userController.updateAddress);
apiRouter.delete("/api/addresses/:id", userController.deleteAddress);

// ==========================================
// Cart Routes
// ==========================================
apiRouter.get("/api/cart", cartController.get);
apiRouter.post("/api/cart/items", cartController.addItem);
apiRouter.patch("/api/cart/items/:id", cartController.updateItem);
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

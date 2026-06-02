import express from "express";
import { authMiddleware } from "../middleware/auth-middleware.js";
import userController from "../controller/user-controller.js";
import cartController from "../controller/cart-controller.js";
import orderController from "../controller/order-controller.js";
import paymentController from "../controller/payment-controller.js";
import { uploadPaymentProof } from "../middleware/upload-middleware.js";

export const apiRouter = express.Router();
apiRouter.use(authMiddleware);

// ==========================================
// User Routes (Profile)
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
apiRouter.delete("/api/cart/items/:id", cartController.removeItem);

// ==========================================
// Order Routes
// ==========================================
apiRouter.post("/api/orders", orderController.create);
apiRouter.get("/api/orders", orderController.list);
apiRouter.get("/api/orders/:id", orderController.get);

// ==========================================
// Payment Routes
// ==========================================
apiRouter.post("/api/orders/:orderId/payment", uploadPaymentProof, paymentController.upload);

// ==========================================
// Review Routes
// ==========================================
// TODO: POST /api/products/:productId/reviews — Tambah review

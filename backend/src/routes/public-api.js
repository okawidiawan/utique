import express from "express";
import userController from "../controller/user-controller.js";
import productController from "../controller/product-controller.js";

export const publicRouter = express.Router();

// ==========================================
// Health Check — Endpoint untuk cek status backend
// ==========================================
publicRouter.get("/api/health", (req, res) => {
  res.json({
    data: {
      status: "OK",
      service: "Utique API",
      timestamp: new Date().toISOString(),
    },
  });
});

// ==========================================
// Auth Routes (Public)
// ==========================================
publicRouter.post("/api/users", userController.register);
publicRouter.post("/api/users/login", userController.login);

// ==========================================
// Product Routes (Public)
// ==========================================
publicRouter.get("/api/products", productController.search);
publicRouter.get("/api/products/:slug", productController.getBySlug);


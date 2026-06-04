import express from "express";
import rateLimit from "express-rate-limit";
import userController from "../controller/user-controller.js";
import productController from "../controller/product-controller.js";

export const publicRouter = express.Router();

/**
 * Rate limiter khusus untuk endpoint login.
 * Lebih ketat dari rate limit global untuk mencegah brute force attack.
 * Maksimal 5 percobaan login per 15 menit per IP address.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  limit: process.env.NODE_ENV === "test" ? 100 : 5, // Lebih longgar saat testing
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.",
  },
  skip: () => process.env.NODE_ENV === "test", // Skip limiter saat testing jika ingin benar-benar bebas
});

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
publicRouter.post("/api/users/login", loginLimiter, userController.login);

// ==========================================
// Product Routes (Public)
// ==========================================
publicRouter.get("/api/products", productController.search);
publicRouter.get("/api/products/:slug", productController.getBySlug);


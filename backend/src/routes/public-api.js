import express from "express";

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
// TODO: POST /api/users — Registrasi akun baru
// TODO: POST /api/users/login — Login

// ==========================================
// Product Routes (Public)
// ==========================================
// TODO: GET /api/products — List produk
// TODO: GET /api/products/:slug — Detail produk

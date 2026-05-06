import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { errorMiddleware } from "../error/error-middleware.js";
import { publicRouter } from "../routes/public-api.js";
import { apiRouter } from "../routes/api.js";
import { adminRouter } from "../routes/admin-api.js";

export const web = express();

// ==========================================
// Middleware Global
// ==========================================

// Keamanan HTTP headers
web.use(helmet());

// CORS — izinkan frontend mengakses API
web.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

// Rate limiting — batasi jumlah request per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  limit: 100, // Maksimal 100 request per window
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Terlalu banyak request, coba lagi nanti." },
});
web.use(limiter);

// Parse JSON body
web.use(express.json());

// Parse URL-encoded body (untuk form data)
web.use(express.urlencoded({ extended: true }));

// ==========================================
// Routes
// ==========================================

// Public routes (tanpa autentikasi)
web.use(publicRouter);

// Authorized routes (membutuhkan token)
web.use(apiRouter);

// Admin routes (membutuhkan token + role ADMIN)
web.use(adminRouter);

// ==========================================
// Error Handling (harus di paling bawah)
// ==========================================
web.use(errorMiddleware);

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { errorMiddleware } from "../error/error-middleware.js";
import { publicRouter } from "../routes/public-api.js";
import { apiRouter } from "../routes/api.js";
import { adminRouter } from "../routes/admin-api.js";

export const web = express();

/**
 * Trust satu level proxy (reverse proxy dari platform hosting seperti Railway/Render).
 * Diperlukan agar express-rate-limit bisa membaca IP user yang sesungguhnya
 * dari header X-Forwarded-For, bukan IP proxy.
 */
web.set("trust proxy", 1);

// ==========================================
// Middleware Global
// ==========================================

// Keamanan HTTP headers
web.use(helmet());

/**
 * Membangun daftar origin yang diizinkan untuk CORS.
 * Membaca dari environment variable CORS_ORIGIN, mendukung multiple
 * origin yang dipisahkan dengan koma.
 *
 * Contoh .env: CORS_ORIGIN=https://utique.com,https://staging.utique.com
 */
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map((origin) => origin.trim());

// CORS — izinkan frontend mengakses API
web.use(
  cors({
    origin: (requestOrigin, callback) => {
      // Izinkan request tanpa origin (misalnya Postman, curl)
      if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
        callback(null, true);
      } else {
        callback(new Error("Akses ditolak oleh CORS policy."));
      }
    },
    credentials: true,
  })
);

// Rate limiting — batasi jumlah request per IP
// Dinonaktifkan saat testing untuk menghindari error 429
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  limit: process.env.NODE_ENV === "test" ? 1000 : 100, // Tingkatkan limit saat test
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

import { ZodError } from "zod";
import { ResponseError } from "./response-error.js";

// ==========================================
// Error Middleware — Menangani semua error secara terpusat
// Mengubah berbagai jenis error menjadi format response JSON yang konsisten.
// Format error: { error: "pesan error" }
// ==========================================
export const errorMiddleware = (err, req, res, next) => {
  if (!err) {
    return next();
  }

  // Error dari validasi Zod
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: err.issues.map((issue) => issue.message).join(", "),
    });
  }

  // Error custom dari ResponseError
  if (err instanceof ResponseError) {
    return res.status(err.status).json({
      error: err.message,
    });
  }

  // Error tidak terduga (500 Internal Server Error)
  console.error("Unexpected Error:", err);
  return res.status(500).json({
    error: "Terjadi kesalahan pada server.",
  });
};

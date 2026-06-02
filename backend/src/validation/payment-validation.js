import { z } from "zod";

// ==========================================
// Payment Validation — Skema validasi untuk domain Payment
// Digunakan oleh Service layer untuk memvalidasi input dari request.
// ==========================================

// Schema untuk admin verify — notes opsional
export const verifyPaymentValidation = z.object({
  notes: z.string().max(255, "Catatan maksimal 255 karakter.").optional(),
});

// Schema untuk admin reject — reason wajib
export const rejectPaymentValidation = z.object({
  reason: z.string({
    required_error: "Alasan penolakan wajib diisi.",
    invalid_type_error: "Alasan penolakan wajib diisi.",
  }).min(1, "Alasan penolakan wajib diisi.").max(255, "Alasan maksimal 255 karakter."),
});

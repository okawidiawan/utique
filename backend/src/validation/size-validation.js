import { z } from "zod";

// ==========================================
// Size Validation — Skema validasi untuk domain Size
// Pesan error dalam Bahasa Indonesia sesuai konvensi.
// ==========================================

export const createSizeValidation = z.object({
  name: z
    .string()
    .min(1, "Nama ukuran wajib diisi.")
    .max(50, "Nama ukuran maksimal 50 karakter."),
  description: z
    .string()
    .max(100, "Deskripsi maksimal 100 karakter.")
    .optional()
    .nullable(),
});

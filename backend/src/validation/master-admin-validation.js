import { z } from "zod";

// ==========================================
// Master Admin Validation — Skema validasi untuk domain Flavor & Size
// Pesan error dalam Bahasa Indonesia sesuai konvensi.
// ==========================================

export const createFlavorValidation = z.object({
  name: z
    .string()
    .min(1, "Nama rasa wajib diisi.")
    .max(50, "Nama rasa maksimal 50 karakter."),
});

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

import { z } from "zod";

// ==========================================
// Flavor Validation — Skema validasi untuk domain Flavor
// Pesan error dalam Bahasa Indonesia sesuai konvensi.
// ==========================================

export const createFlavorValidation = z.object({
  name: z
    .string()
    .min(1, "Nama rasa wajib diisi.")
    .max(50, "Nama rasa maksimal 50 karakter."),
});

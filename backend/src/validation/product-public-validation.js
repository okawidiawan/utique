import { z } from "zod";

// ==========================================
// Product Validation — Skema validasi untuk domain Product (Public)
// Pesan error dalam Bahasa Indonesia sesuai konvensi.
// ==========================================

export const searchProductValidation = z.object({
  name: z.string().optional(),
  page: z.coerce.number().int().min(1, "Halaman minimal 1.").default(1),
  size: z.coerce.number().int().min(1, "Ukuran halaman minimal 1.").default(10),
});

export const getProductBySlugValidation = z
  .string()
  .min(1, "Slug produk tidak boleh kosong.")
  .max(150, "Slug produk maksimal 150 karakter.");

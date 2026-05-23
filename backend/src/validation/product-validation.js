import { z } from "zod";

// ==========================================
// Product Validation — Skema validasi untuk domain Product
// Pesan error dalam Bahasa Indonesia sesuai konvensi.
// ==========================================

export const createProductValidation = z.object({
  name: z
    .string()
    .min(1, "Nama produk wajib diisi.")
    .max(100, "Nama produk maksimal 100 karakter."),
  description: z
    .string()
    .max(500, "Deskripsi produk maksimal 500 karakter.")
    .optional()
    .nullable(),
  productionTimeDays: z
    .number()
    .int()
    .min(1, "Waktu produksi minimal 1 hari.")
    .optional()
    .default(3),
  isAvailable: z
    .boolean()
    .optional()
    .default(true),
  imageUrl: z
    .string()
    .max(500, "URL gambar maksimal 500 karakter.")
    .optional()
    .nullable(),
});

export const updateProductValidation = z.object({
  name: z
    .string()
    .min(1, "Nama produk minimal 1 karakter.")
    .max(100, "Nama produk maksimal 100 karakter.")
    .optional(),
  description: z
    .string()
    .max(500, "Deskripsi produk maksimal 500 karakter.")
    .optional()
    .nullable(),
  productionTimeDays: z
    .number()
    .int()
    .min(1, "Waktu produksi minimal 1 hari.")
    .optional(),
  isAvailable: z
    .boolean()
    .optional(),
  imageUrl: z
    .string()
    .max(500, "URL gambar maksimal 500 karakter.")
    .optional()
    .nullable(),
});

export const getProductValidation = z
  .any()
  .refine(
    (val) => {
      const num = Number(val);
      return !isNaN(num) && Number.isInteger(num) && num > 0;
    },
    {
      message: "ID produk tidak valid.",
    }
  )
  .transform((val) => Number(val));

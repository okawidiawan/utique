import { z } from "zod";

// ==========================================
// Product Admin Validation — Skema validasi untuk domain Product (Admin)
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

export const createVariantValidation = z.object({
  productId: z
    .number({
      required_error: "ID produk wajib diisi.",
      invalid_type_error: "ID produk tidak valid.",
    })
    .int()
    .positive("ID produk tidak valid."),
  flavorId: z
    .number({
      required_error: "ID rasa wajib diisi.",
      invalid_type_error: "ID rasa tidak valid.",
    })
    .int()
    .positive("ID rasa tidak valid."),
  sizeId: z
    .number({
      required_error: "ID ukuran wajib diisi.",
      invalid_type_error: "ID ukuran tidak valid.",
    })
    .int()
    .positive("ID ukuran tidak valid."),
  price: z
    .number({
      required_error: "Harga wajib diisi.",
      invalid_type_error: "Harga tidak valid.",
    })
    .int()
    .min(1, "Harga minimal Rp 1."),
  isAvailable: z
    .boolean()
    .optional()
    .default(true),
});

export const updateVariantValidation = z.object({
  price: z
    .number({
      invalid_type_error: "Harga tidak valid.",
    })
    .int()
    .min(1, "Harga minimal Rp 1.")
    .optional(),
  isAvailable: z
    .boolean()
    .optional(),
});

export const getVariantValidation = z
  .any()
  .refine(
    (val) => {
      const num = Number(val);
      return !isNaN(num) && Number.isInteger(num) && num > 0;
    },
    {
      message: "ID varian tidak valid.",
    }
  )
  .transform((val) => Number(val));


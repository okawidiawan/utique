import { z } from "zod";

// ==========================================
// Product Variant Validation — Skema validasi untuk domain ProductVariant
// Pesan error dalam Bahasa Indonesia sesuai konvensi.
// ==========================================

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

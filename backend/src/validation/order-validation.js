import { z } from "zod";

// ==========================================
// Order Validation — Skema validasi untuk domain Order
// Pesan error dalam Bahasa Indonesia sesuai konvensi.
// ==========================================

export const createOrderValidation = z.object({
  address_id: z.number({ required_error: "Alamat wajib dipilih." }).positive("ID Alamat harus valid."),
  shipping_courier: z.string().max(50, "Nama kurir maksimal 50 karakter.").optional(),
});

/**
 * Schema validasi untuk parameter query list order customer.
 * Mengikuti konvensi paginasi yang ada di CONTEXT.md.
 */
export const listOrderValidation = z.object({
  page: z.coerce.number().int().min(1, "Halaman minimal 1.").default(1),
  size: z.coerce.number().int().min(1, "Ukuran halaman minimal 1.").max(100, "Ukuran halaman maksimal 100.").default(10),
});


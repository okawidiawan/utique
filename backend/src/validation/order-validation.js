import { z } from "zod";

// ==========================================
// Order Validation — Skema validasi untuk domain Order
// Pesan error dalam Bahasa Indonesia sesuai konvensi.
// ==========================================

export const createOrderValidation = z.object({
  address_id: z.number({ required_error: "Alamat wajib dipilih." }).positive("ID Alamat harus valid."),
  shipping_courier: z.string().max(50, "Nama kurir maksimal 50 karakter.").optional(),
});

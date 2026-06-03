import { z } from "zod";

// ==========================================
// Admin Order Validation — Skema validasi untuk manajemen order oleh admin
// Pesan error dalam Bahasa Indonesia sesuai konvensi.
// ==========================================

// Validasi untuk filter list order (query params)
export const getAdminOrdersValidation = z.object({
  status: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val ||
        [
          "PENDING_PAYMENT",
          "PAID",
          "IN_QUEUE",
          "IN_PRODUCTION",
          "DONE",
          "SHIPPED",
          "COMPLETED",
          "CANCELLED",
        ].includes(val),
      { message: "Status tidak valid" }
    ),
  page: z.coerce.number().min(1, "Halaman minimal 1").default(1),
  size: z.coerce
    .number()
    .min(1, "Ukuran halaman minimal 1")
    .max(100, "Ukuran halaman maksimal 100")
    .default(10),
});

// Validasi untuk update status
export const updateOrderStatusValidation = z.object({
  status: z
    .string({ required_error: "Status wajib diisi" })
    .min(1, "Status wajib diisi")
    .refine(
      (val) => ["IN_QUEUE", "IN_PRODUCTION", "DONE", "SHIPPED", "COMPLETED"].includes(val),
      { message: "Status tidak valid" }
    ),
});

// Validasi untuk input info pengiriman
export const updateOrderShippingValidation = z.object({
  shipping_tracking_number: z
    .string({ required_error: "Nomor resi wajib diisi" })
    .min(1, "Nomor resi wajib diisi")
    .min(3, "Nomor resi minimal 3 karakter"),
  shipping_courier: z
    .string({ required_error: "Kurir wajib diisi" })
    .min(1, "Kurir wajib diisi")
    .min(2, "Nama kurir minimal 2 karakter"),
});

// Validasi untuk override estimasi
export const updateOrderEstimationValidation = z.object({
  estimated_completion_date: z
    .string({ required_error: "Estimasi tanggal wajib diisi" })
    .min(1, "Estimasi tanggal wajib diisi")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid, gunakan format YYYY-MM-DD"),
});

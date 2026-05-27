import { z } from "zod";

// ==========================================
// Address Validation — Skema validasi untuk domain Address
// Pesan error dalam Bahasa Indonesia sesuai konvensi.
// ==========================================

// Skema untuk Tambah Alamat
export const createAddressValidation = z.object({
  label: z
    .string()
    .min(1, "Label wajib diisi.")
    .max(50, "Label maksimal 50 karakter."),
  recipientName: z
    .string()
    .min(1, "Nama penerima wajib diisi.")
    .max(100, "Nama penerima maksimal 100 karakter."),
  phone: z
    .string()
    .min(1, "Nomor telepon wajib diisi.")
    .max(20, "Nomor telepon maksimal 20 karakter."),
  province: z
    .string()
    .min(1, "Provinsi wajib diisi.")
    .max(100, "Provinsi maksimal 100 karakter."),
  city: z
    .string()
    .min(1, "Kota wajib diisi.")
    .max(100, "Kota maksimal 100 karakter."),
  district: z
    .string()
    .min(1, "Kecamatan wajib diisi.")
    .max(100, "Kecamatan maksimal 100 karakter."),
  postalCode: z
    .string()
    .min(1, "Kode pos wajib diisi.")
    .max(10, "Kode pos maksimal 10 karakter."),
  fullAddress: z.string().min(1, "Alamat lengkap wajib diisi."),
  isDefault: z.boolean().optional(),
});

// Skema untuk Ubah Alamat (semua opsional)
export const updateAddressValidation = z.object({
  label: z
    .string()
    .min(1, "Label minimal 1 karakter.")
    .max(50, "Label maksimal 50 karakter.")
    .optional(),
  recipientName: z
    .string()
    .min(1, "Nama penerima minimal 1 karakter.")
    .max(100, "Nama penerima maksimal 100 karakter.")
    .optional(),
  phone: z
    .string()
    .min(1, "Nomor telepon minimal 1 karakter.")
    .max(20, "Nomor telepon maksimal 20 karakter.")
    .optional(),
  province: z
    .string()
    .min(1, "Provinsi minimal 1 karakter.")
    .max(100, "Provinsi maksimal 100 karakter.")
    .optional(),
  city: z
    .string()
    .min(1, "Kota minimal 1 karakter.")
    .max(100, "Kota maksimal 100 karakter.")
    .optional(),
  district: z
    .string()
    .min(1, "Kecamatan minimal 1 karakter.")
    .max(100, "Kecamatan maksimal 100 karakter.")
    .optional(),
  postalCode: z
    .string()
    .min(1, "Kode pos minimal 1 karakter.")
    .max(10, "Kode pos maksimal 10 karakter.")
    .optional(),
  fullAddress: z.string().min(1, "Alamat lengkap minimal 1 karakter.").optional(),
  isDefault: z.boolean().optional(),
});

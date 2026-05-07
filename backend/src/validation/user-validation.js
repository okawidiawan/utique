import { z } from "zod";

// ==========================================
// User Validation — Skema validasi untuk domain User
// Pesan error dalam Bahasa Indonesia sesuai konvensi.
// ==========================================

// Skema untuk Registrasi
export const registerUserValidation = z.object({
  name: z
    .string()
    .min(1, "Nama wajib diisi.")
    .max(100, "Nama maksimal 100 karakter."),
  email: z
    .string()
    .min(1, "Email wajib diisi.")
    .email("Format email tidak valid.")
    .max(100, "Email maksimal 100 karakter."),
  password: z
    .string()
    .min(6, "Password minimal 6 karakter.")
    .max(100, "Password maksimal 100 karakter."),
  phone: z
    .string()
    .max(20, "Nomor telepon maksimal 20 karakter.")
    .optional()
    .nullable(),
});

// Skema untuk Login
export const loginUserValidation = z.object({
  email: z
    .string()
    .min(1, "Email wajib diisi.")
    .email("Format email tidak valid.")
    .max(100, "Email maksimal 100 karakter."),
  password: z
    .string()
    .min(1, "Password wajib diisi.")
    .max(100, "Password maksimal 100 karakter."),
});

// Skema untuk Update Profil
export const updateUserValidation = z.object({
  name: z
    .string()
    .min(1, "Nama minimal 1 karakter.")
    .max(100, "Nama maksimal 100 karakter.")
    .optional(),
  email: z
    .string()
    .email("Format email tidak valid.")
    .max(100, "Email maksimal 100 karakter.")
    .optional(),
  password: z
    .string()
    .min(6, "Password minimal 6 karakter.")
    .max(100, "Password maksimal 100 karakter.")
    .optional(),
  phone: z
    .string()
    .max(20, "Nomor telepon maksimal 20 karakter.")
    .optional()
    .nullable(),
});

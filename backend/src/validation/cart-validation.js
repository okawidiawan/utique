import { z } from "zod";

/**
 * Skema validasi untuk menambahkan item ke keranjang.
 * Memastikan variant_id adalah angka positif dan quantity minimal 1.
 */
export const addItemCartValidation = z.object({
  variant_id: z.number().positive({ message: "ID varian harus berupa angka positif" }),
  quantity: z.number().min(1, { message: "Jumlah minimal adalah 1" }),
});

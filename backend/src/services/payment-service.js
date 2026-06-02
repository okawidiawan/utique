import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response-error.js";

// ==========================================
// Payment Service — Logika bisnis untuk domain Payment (Customer)
// Menangani proses upload bukti pembayaran oleh customer.
// ==========================================

/**
 * Mengupload bukti pembayaran untuk sebuah order.
 * @param {number} userId - ID user yang sedang login
 * @param {number} orderId - ID order yang akan dibayar
 * @param {Object} file - Object file dari multer (hasil upload Cloudinary)
 * @returns {Promise<Object>} - Data payment yang baru dibuat
 */
const uploadProof = async (userId, orderId, file) => {
  // 3a. Validasi file
  if (!file) {
    throw new ResponseError(400, "Bukti pembayaran wajib diupload.");
  }

  // 3b. Validasi order (pastikan order milik user dan statusnya tepat)
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId: userId,
    },
  });

  if (!order) {
    throw new ResponseError(404, "Pesanan tidak ditemukan.");
  }

  if (order.status !== "PENDING_PAYMENT") {
    throw new ResponseError(400, "Pesanan ini tidak menunggu pembayaran.");
  }

  // Cek apakah sudah melewati batas waktu bayar
  if (new Date() > order.paymentDeadline) {
    throw new ResponseError(400, "Batas waktu pembayaran sudah habis.");
  }

  // 3c. Cek duplikasi payment
  // Customer tidak boleh upload jika sudah ada yang PENDING (menunggu review) atau VERIFIED (sudah lunas).
  // Diperbolehkan upload ulang jika status payment sebelumnya REJECTED.
  const existingPayment = await prisma.payment.findFirst({
    where: {
      orderId: orderId,
      status: {
        in: ["PENDING", "VERIFIED"],
      },
    },
  });

  if (existingPayment) {
    throw new ResponseError(400, "Bukti pembayaran sudah pernah diupload.");
  }

  // 3d. Ambil URL dari hasil upload Cloudinary
  // multer-storage-cloudinary menyimpan URL di property 'path'
  const proofImageUrl = file.path;

  // 3e. Simpan record Payment (Gunakan upsert karena orderId bersifat unique)
  // Jika sudah ada (statusnya pasti REJECTED karena sudah lolos validasi di atas), maka update.
  // Jika belum ada, maka buat baru.
  return prisma.payment.upsert({
    where: {
      orderId: orderId,
    },
    update: {
      proofImageUrl: proofImageUrl,
      status: "PENDING",
      rejectReason: null, // Reset alasan penolakan sebelumnya
      adminNotes: null, // Reset catatan admin sebelumnya
      createdAt: new Date(), // Update waktu upload
    },
    create: {
      orderId: orderId,
      proofImageUrl: proofImageUrl,
      status: "PENDING",
    },
    select: {
      id: true,
      orderId: true,
      proofImageUrl: true,
      status: true,
      createdAt: true,
    },
  });
};

export default {
  uploadProof,
};

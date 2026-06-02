import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response-error.js";
import { verifyPaymentValidation, rejectPaymentValidation } from "../validation/payment-validation.js";

// ==========================================
// Payment Admin Service — Logika bisnis untuk domain Payment (Admin)
// Menangani proses verifikasi dan penolakan pembayaran oleh admin.
// ==========================================

/**
 * Memverifikasi pembayaran oleh admin.
 * @param {number} paymentId - ID payment
 * @param {Object} request - Body request berisi notes opsional
 * @returns {Promise<string>} - Pesan sukses
 */
const verify = async (paymentId, request) => {
  // 4a. Validasi input
  const verifyRequest = verifyPaymentValidation.parse(request);

  // 4b. Cek payment (sertakan order untuk mempermudah update status order)
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: true },
  });

  if (!payment) {
    throw new ResponseError(404, "Data pembayaran tidak ditemukan.");
  }

  if (payment.status !== "PENDING") {
    throw new ResponseError(400, "Pembayaran ini sudah diproses sebelumnya.");
  }

  // 4c. Jalankan transaksi (Update Payment status & Order status)
  return await prisma.$transaction(async (tx) => {
    // 1. Update Payment
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: "VERIFIED",
        adminNotes: verifyRequest.notes || null,
        verifiedAt: new Date(),
      },
    });

    // 2. Update Order
    await tx.order.update({
      where: { id: payment.orderId },
      data: {
        status: "PAID",
      },
    });

    return "Pembayaran berhasil diverifikasi.";
  });
};

/**
 * Menolak pembayaran oleh admin.
 * @param {number} paymentId - ID payment
 * @param {Object} request - Body request berisi reason wajib
 * @returns {Promise<string>} - Pesan sukses
 */
const reject = async (paymentId, request) => {
  // 4a. Validasi input
  const rejectRequest = rejectPaymentValidation.parse(request);

  // 4b. Cek payment
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new ResponseError(404, "Data pembayaran tidak ditemukan.");
  }

  if (payment.status !== "PENDING") {
    throw new ResponseError(400, "Pembayaran ini sudah diproses sebelumnya.");
  }

  // 4c. Update Payment (Order status tetap PENDING_PAYMENT agar customer bisa upload ulang)
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: "REJECTED",
      rejectReason: rejectRequest.reason,
    },
  });

  return "Pembayaran ditolak.";
};

export default {
  verify,
  reject,
};

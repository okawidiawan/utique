import cron from "node-cron";
import { prisma } from "../application/database.js";
import { logger } from "../application/logger.js";

/**
 * Job otomatis untuk membatalkan order yang melewati batas waktu pembayaran.
 * Job ini berjalan setiap 5 menit.
 *
 * Alur kerja:
 * 1. Cari semua order berstatus PENDING_PAYMENT dengan paymentDeadline di masa lalu.
 * 2. Untuk setiap order, update status menjadi CANCELLED.
 * 3. Hapus entri ProductionQueue terkait (jika ada).
 * 4. Log jumlah order yang berhasil di-cancel.
 */
const runAutoCancelJob = async () => {
  const now = new Date();

  try {
    // Cari semua order yang sudah melewati deadline dan belum dibatalkan
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: "PENDING_PAYMENT",
        paymentDeadline: { lt: now }, // lt = less than (lebih kecil dari sekarang)
      },
      select: { id: true },
    });

    if (expiredOrders.length === 0) {
      return; // Tidak ada yang perlu dibatalkan
    }

    const expiredOrderIds = expiredOrders.map((o) => o.id);

    // Update semua order expired dalam satu transaksi
    await prisma.$transaction([
      // Hapus entri ProductionQueue terkait jika ada
      prisma.productionQueue.deleteMany({
        where: { orderId: { in: expiredOrderIds } },
      }),
      // Update status order menjadi CANCELLED
      prisma.order.updateMany({
        where: { id: { in: expiredOrderIds } },
        data: {
          status: "CANCELLED",
          cancelReason: "Batas waktu pembayaran habis (otomatis).",
        },
      }),
    ]);

    logger.info(`[Auto-Cancel Job] ${expiredOrderIds.length} order dibatalkan karena melewati batas waktu pembayaran.`);
  } catch (error) {
    logger.error({ error, message: error.message }, "[Auto-Cancel Job] Gagal menjalankan job");
  }
};

/**
 * Mendaftarkan dan menjalankan scheduled job auto-cancel.
 * Jadwal: setiap 5 menit ("* / 5 * * * *")
 */
const startAutoCancelJob = () => {
  logger.info("[Auto-Cancel Job] Job dimulai. Berjalan setiap 5 menit.");

  // Jalankan sekali saat startup untuk membersihkan order yang sudah expired
  runAutoCancelJob();

  // Kemudian jadwalkan setiap 5 menit
  cron.schedule("*/5 * * * *", runAutoCancelJob);
};

export { startAutoCancelJob, runAutoCancelJob };


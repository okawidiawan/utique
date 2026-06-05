import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response-error.js";
import { createOrderValidation, listOrderValidation } from "../validation/order-validation.js";

/**
 * Membuat nomor order unik dengan format UTQ-YYYYMMDD-XXX.
 * Menggunakan retry loop untuk menangani kemungkinan race condition
 * di mana dua order dibuat bersamaan pada hari yang sama.
 *
 * @param {Object} tx - Prisma transaction client
 * @param {string} dateStr - String tanggal format YYYYMMDD
 * @param {number} maxRetries - Jumlah maksimal percobaan ulang
 * @returns {Promise<string>} Nomor order yang unik
 */
const generateOrderNumber = async (tx, dateStr, maxRetries = 5) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Hitung jumlah order hari ini untuk membuat serial number
    const orderCountToday = await tx.order.count({
      where: {
        orderNumber: {
          startsWith: `UTQ-${dateStr}`,
        },
      },
    });

    // Tambahkan angka acak kecil pada percobaan ulang untuk mengurangi
    // kemungkinan collision berikutnya
    const offset = attempt > 1 ? Math.floor(Math.random() * 10) : 0;
    const serial = (orderCountToday + 1 + offset).toString().padStart(3, "0");
    const candidate = `UTQ-${dateStr}-${serial}`;

    // Cek apakah nomor ini sudah dipakai (double-check)
    const existing = await tx.order.findUnique({
      where: { orderNumber: candidate },
    });

    if (!existing) {
      return candidate; // Nomor aman, kembalikan
    }
    // Jika sudah ada, lanjut ke percobaan berikutnya
  }
  throw new ResponseError(500, "Gagal membuat nomor order. Coba lagi.");
};

/**
 * Membuat order baru dari item yang ada di keranjang (Checkout).
 * @param {number} userId - ID user yang sedang login
 * @param {Object} request - Body request berisi address_id dan optional shipping_courier
 * @returns {Promise<Object>} - Data order yang baru dibuat
 */
const create = async (userId, request) => {
  // 1. Validasi input
  const createRequest = createOrderValidation.parse(request);

  // 2. Ambil keranjang user beserta item dan detail variannya
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          productVariant: {
            include: {
              product: true,
              flavor: true,
              size: true,
            },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new ResponseError(400, "Keranjang belanja kosong.");
  }

  // 3. Validasi alamat pengiriman (harus milik user yang login)
  const address = await prisma.address.findFirst({
    where: {
      id: createRequest.address_id,
      userId: userId,
    },
  });

  if (!address) {
    throw new ResponseError(404, "Alamat tidak ditemukan.");
  }

  // 4. Hitung total harga & cari waktu produksi terlama
  let totalPrice = 0;
  let maxProductionDays = 0;
  const orderItemsData = [];

  for (const item of cart.items) {
    // Pastikan produk & varian masih tersedia
    if (!item.productVariant.isAvailable || !item.productVariant.product.isAvailable) {
      throw new ResponseError(400, `Produk ${item.productVariant.product.name} varian ${item.productVariant.flavor.name} sedang tidak tersedia.`);
    }

    const subtotal = item.productVariant.price * item.quantity;
    totalPrice += subtotal;

    // Track waktu produksi terlama untuk estimasi
    if (item.productVariant.product.productionTimeDays > maxProductionDays) {
      maxProductionDays = item.productVariant.product.productionTimeDays;
    }

    // Persiapkan snapshot data untuk OrderItem
    orderItemsData.push({
      productVariantId: item.productVariantId,
      productName: item.productVariant.product.name,
      flavorName: item.productVariant.flavor.name,
      sizeName: item.productVariant.size.name,
      price: item.productVariant.price,
      quantity: item.quantity,
      subtotal: subtotal,
    });
  }

  // 5. Persiapkan variabel untuk nomor order dan batas waktu
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const deadlineHours = parseInt(process.env.PAYMENT_DEADLINE_HOURS || "24", 10);
  const paymentDeadline = new Date(now.getTime() + deadlineHours * 60 * 60 * 1000);

  // 7. Eksekusi transaksi database
  try {
    return await prisma.$transaction(async (tx) => {
      // a. Generate Order Number (Format: UTQ-YYYYMMDD-SERIAL)
      // Dilakukan dengan helper function yang memiliki logika retry untuk mencegah race condition
      const orderNumber = await generateOrderNumber(tx, dateStr);

      // b. Hitung tanggal produksi dan posisi antrian (Kapasitas maks 10 order per hari)
      // Mulai dari hari ini + maxProductionDays
      let productionDate = new Date(now);
      productionDate.setDate(productionDate.getDate() + maxProductionDays);
      productionDate.setHours(0, 0, 0, 0);

      let queuePosition = 0;
      let foundSlot = false;

      while (!foundSlot) {
        const ordersOnDate = await tx.productionQueue.count({
          where: { productionDate },
        });

        if (ordersOnDate < 10) {
          queuePosition = ordersOnDate + 1;
          foundSlot = true;
        } else {
          // Jika sudah penuh (10), geser ke hari berikutnya
          productionDate.setDate(productionDate.getDate() + 1);
        }
      }

      // c. Buat record Order
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          addressId: address.id,
          totalPrice,
          shippingCost: 0, // Ongkos kirim sementara 0 (gratis) selama tahap awal. TODO: Implementasikan flat rate per zona atau integrasi RajaOngkir di fase lanjutan.
          grandTotal: totalPrice,
          shippingCourier: createRequest.shipping_courier || "Ekspedisi",
          paymentDeadline,
          estimatedCompletion: productionDate, // Menggunakan productionDate sebagai estimasi selesai
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: true,
          address: true,
        },
      });

      // d. Buat record ProductionQueue
      await tx.productionQueue.create({
        data: {
          orderId: order.id,
          productionDate,
          queuePosition,
        },
      });

      // e. Kosongkan keranjang belanja user
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return order;
    });
  } catch (error) {
    // Tangkap Prisma unique constraint error (P2002)
    if (error.code === "P2002" && error.meta?.target?.includes("orderNumber")) {
      throw new ResponseError(500, "Terjadi konflik nomor order. Silakan coba lagi.");
    }
    throw error; // Lempar ulang error lain agar ditangkap error middleware
  }
};

/**
 * Mengambil daftar pesanan milik user yang sedang login dengan paginasi.
 * Diurutkan berdasarkan tanggal terbaru.
 *
 * @param {number} userId - ID user
 * @param {Object} request - Parameter paginasi { page, size }
 * @returns {Promise<Object>} - List order dan informasi paginasi
 */
const list = async (userId, request) => {
  // 1. Validasi parameter paginasi
  const listRequest = listOrderValidation.parse(request);
  const skip = (listRequest.page - 1) * listRequest.size;

  // 2. Jalankan query data dan count secara paralel untuk efisiensi
  const [orders, totalItem] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { items: true },
      skip,
      take: listRequest.size,
    }),
    prisma.order.count({
      where: { userId },
    }),
  ]);

  return {
    data: orders,
    paging: {
      page: listRequest.page,
      total_item: totalItem,
      total_page: Math.ceil(totalItem / listRequest.size),
    },
  };
};

/**
 * Mengambil detail pesanan berdasarkan ID.
 * @param {number} userId - ID user (untuk isolasi data)
 * @param {number} orderId - ID order
 * @returns {Promise<Object>} - Detail order
 */
const get = async (userId, orderId) => {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId: userId,
    },
    include: {
      items: true,
      address: true,
      payment: true,
    },
  });

  if (!order) {
    throw new ResponseError(404, "Pesanan tidak ditemukan.");
  }

  return order;
};

export default {
  create,
  list,
  get,
};

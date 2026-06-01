import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response-error.js";
import { createOrderValidation } from "../validation/order-validation.js";

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
  const paymentDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // 7. Eksekusi transaksi database
  return await prisma.$transaction(async (tx) => {
    // a. Generate Order Number (Format: UTQ-YYYYMMDD-SERIAL)
    // Dilakukan di dalam transaksi untuk mencegah race condition
    const orderCountToday = await tx.order.count({
      where: {
        orderNumber: {
          startsWith: `UTQ-${dateStr}`,
        },
      },
    });
    const serial = (orderCountToday + 1).toString().padStart(3, "0");
    const orderNumber = `UTQ-${dateStr}-${serial}`;

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
        shippingCost: 0, // Flat rate 0 (tahap awal)
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
};

/**
 * Mengambil daftar pesanan milik user yang sedang login.
 * @param {number} userId - ID user
 * @returns {Promise<Array>} - List order
 */
const list = async (userId) => {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
    },
  });
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

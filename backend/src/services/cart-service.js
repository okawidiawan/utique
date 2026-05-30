import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response-error.js";
import { addItemCartValidation } from "../validation/cart-validation.js";

/**
 * Mengambil isi keranjang belanja user beserta detail produk, varian, dan rasa.
 * @param {number} userId - ID user yang sedang login
 * @returns {Promise<Array>} - List item keranjang yang sudah di-mapping
 */
const get = async (userId) => {
  // 1. Cari keranjang milik user
  const cart = await prisma.cart.findUnique({
    where: {
      userId: userId,
    },
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

  // 2. Jika keranjang belum ada (user belum pernah tambah item), kembalikan array kosong
  if (!cart) {
    return [];
  }

  // 3. Mapping data ke format yang lebih flat untuk memudahkan frontend
  return cart.items.map((item) => ({
    cart_item_id: item.id,
    quantity: item.quantity,
    price: item.productVariant.price,
    product: {
      name: item.productVariant.product.name,
      slug: item.productVariant.product.slug,
      image_url: item.productVariant.product.imageUrl,
    },
    variant: {
      name: item.productVariant.size.name,
    },
    flavor: {
      name: item.productVariant.flavor.name,
    },
  }));
};

/**
 * Menambahkan item ke keranjang belanja user.
 * Membuat keranjang baru jika belum ada, atau meng-update quantity jika item sudah ada.
 * @param {number} userId - ID user yang sedang login
 * @param {Object} request - Body request berisi variant_id dan quantity
 * @returns {Promise<Object>} - Pesan sukses
 */
const addItem = async (userId, request) => {
  // 1. Validasi input menggunakan Zod
  const addItemRequest = addItemCartValidation.parse(request);

  // 2. Verifikasi ketersediaan varian produk
  const variant = await prisma.productVariant.findUnique({
    where: {
      id: addItemRequest.variant_id,
    },
    include: {
      product: true,
    },
  });

  if (!variant) {
    throw new ResponseError(404, "Varian produk tidak ditemukan.");
  }

  // Pastikan produk dan varian aktif (tersedia)
  if (!variant.isAvailable || !variant.product.isAvailable) {
    throw new ResponseError(400, "Produk atau varian sedang tidak tersedia.");
  }

  // 3. Ambil keranjang user atau buat baru jika belum ada
  let cart = await prisma.cart.findUnique({
    where: {
      userId: userId,
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        userId: userId,
      },
    });
  }

  // 4. Upsert item ke dalam keranjang
  // Jika kombinasi cartId dan variantId sudah ada, increment quantity.
  // Jika belum ada, buat record baru.
  await prisma.cartItem.upsert({
    where: {
      cartId_productVariantId: {
        cartId: cart.id,
        productVariantId: variant.id,
      },
    },
    update: {
      quantity: {
        increment: addItemRequest.quantity,
      },
    },
    create: {
      cartId: cart.id,
      productVariantId: variant.id,
      quantity: addItemRequest.quantity,
    },
  });

  return {
    message: "Item berhasil ditambahkan ke keranjang",
  };
};

export default {
  get,
  addItem,
};

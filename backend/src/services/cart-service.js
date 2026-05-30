import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response-error.js";
import { addItemCartValidation, updateItemCartValidation } from "../validation/cart-validation.js";

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

/**
 * Memperbarui item yang sudah ada di dalam keranjang.
 * @param {number} userId - ID user yang sedang login
 * @param {number} cartItemId - ID item keranjang yang ingin diubah
 * @param {Object} request - Body request berisi variant_id dan/atau quantity
 * @returns {Promise<Object>} - Data item yang sudah diupdate
 */
const updateItem = async (userId, cartItemId, request) => {
  // 1. Validasi input
  const updateRequest = updateItemCartValidation.parse(request);

  // 2. Cari item dan pastikan milik user yang login
  const cartItem = await prisma.cartItem.findUnique({
    where: {
      id: cartItemId,
    },
    include: {
      cart: true,
    },
  });

  if (!cartItem || cartItem.cart.userId !== userId) {
    throw new ResponseError(404, "Item tidak ditemukan di dalam keranjang.");
  }

  const dataToUpdate = {};

  // 3. Jika ganti varian, cek ketersediaannya
  if (updateRequest.variant_id) {
    const variant = await prisma.productVariant.findUnique({
      where: {
        id: updateRequest.variant_id,
      },
      include: {
        product: true,
      },
    });

    if (!variant) {
      throw new ResponseError(404, "Varian produk tidak ditemukan.");
    }

    if (!variant.isAvailable || !variant.product.isAvailable) {
      throw new ResponseError(400, "Produk atau varian sedang tidak tersedia.");
    }

    // 4. Handle "Merge Logic": Jika ganti ke varian yang sudah ada di keranjang
    const existingItemWithNewVariant = await prisma.cartItem.findFirst({
      where: {
        cartId: cartItem.cartId,
        productVariantId: updateRequest.variant_id,
        id: {
          not: cartItemId, // Bukan item yang sedang kita edit
        },
      },
    });

    if (existingItemWithNewVariant) {
      // Gabungkan quantity ke item yang sudah ada, lalu hapus item saat ini
      const newQuantity = existingItemWithNewVariant.quantity + (updateRequest.quantity || cartItem.quantity);
      
      const updatedItem = await prisma.cartItem.update({
        where: {
          id: existingItemWithNewVariant.id,
        },
        data: {
          quantity: newQuantity,
        },
        include: {
          productVariant: {
            include: {
              product: true,
              flavor: true,
              size: true,
            },
          },
        },
      });

      await prisma.cartItem.delete({
        where: {
          id: cartItemId,
        },
      });

      return {
        id: updatedItem.id,
        quantity: updatedItem.quantity,
        variant: {
          id: updatedItem.productVariant.id,
          name: `${updatedItem.productVariant.product.name} - ${updatedItem.productVariant.flavor.name} (${updatedItem.productVariant.size.name})`,
        },
      };
    }

    dataToUpdate.productVariantId = updateRequest.variant_id;
  }

  if (updateRequest.quantity) {
    dataToUpdate.quantity = updateRequest.quantity;
  }

  // 5. Jalankan update jika tidak terjadi merge
  const result = await prisma.cartItem.update({
    where: {
      id: cartItemId,
    },
    data: dataToUpdate,
    include: {
      productVariant: {
        include: {
          product: true,
          flavor: true,
          size: true,
        },
      },
    },
  });

  return {
    id: result.id,
    quantity: result.quantity,
    variant: {
      id: result.productVariant.id,
      name: `${result.productVariant.product.name} - ${result.productVariant.flavor.name} (${result.productVariant.size.name})`,
    },
  };
};

export default {
  get,
  addItem,
  updateItem,
};

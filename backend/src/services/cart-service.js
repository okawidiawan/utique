import { prisma } from "../application/database.js";

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

export default {
  get,
};

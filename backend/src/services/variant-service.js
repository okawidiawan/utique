import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response-error.js";
import { getProductValidation } from "../validation/product-validation.js";
import {
  createVariantValidation,
  updateVariantValidation,
  getVariantValidation,
} from "../validation/variant-validation.js";

/**
 * Menambahkan Varian Baru ke Produk (Admin Only)
 * @param {Number} productId - ID produk induk
 * @param {Object} request - Body request berisi flavorId, sizeId, price, isAvailable
 * @returns {Object} - Data varian yang berhasil dibuat
 */
const create = async (productId, request) => {
  // 1. Validasi parameter ID produk
  const parsedProductId = getProductValidation.parse(productId);

  // 2. Validasi body request beserta productId
  const variantRequest = createVariantValidation.parse({
    ...request,
    productId: parsedProductId,
  });

  // 3. Pastikan produk induk ada
  const productCount = await prisma.product.count({
    where: { id: variantRequest.productId },
  });
  if (productCount === 0) {
    throw new ResponseError(404, "Produk tidak ditemukan.");
  }

  // 4. Pastikan rasa (Flavor) ada
  const flavorCount = await prisma.flavor.count({
    where: { id: variantRequest.flavorId },
  });
  if (flavorCount === 0) {
    throw new ResponseError(400, "Rasa tidak ditemukan.");
  }

  // 5. Pastikan ukuran (Size) ada
  const sizeCount = await prisma.size.count({
    where: { id: variantRequest.sizeId },
  });
  if (sizeCount === 0) {
    throw new ResponseError(400, "Ukuran tidak ditemukan.");
  }

  // 6. Cek keunikan kombinasi (productId, flavorId, sizeId)
  const countDuplicate = await prisma.productVariant.count({
    where: {
      productId: variantRequest.productId,
      flavorId: variantRequest.flavorId,
      sizeId: variantRequest.sizeId,
    },
  });
  if (countDuplicate === 1) {
    throw new ResponseError(400, "Varian produk ini sudah terdaftar.");
  }

  // 7. Simpan ke database
  return prisma.productVariant.create({
    data: variantRequest,
  });
};

/**
 * Memperbarui Data Varian Produk (Admin Only)
 * @param {Number} variantId - ID varian produk
 * @param {Object} request - Body request berisi data baru (price, isAvailable)
 * @returns {Object} - Data varian hasil update
 */
const update = async (variantId, request) => {
  // 1. Validasi ID varian
  const id = getVariantValidation.parse(variantId);

  // 2. Validasi body update
  const updateRequest = updateVariantValidation.parse(request);

  // 3. Pastikan varian ada
  const variantExist = await prisma.productVariant.findUnique({
    where: { id },
  });
  if (!variantExist) {
    throw new ResponseError(404, "Varian tidak ditemukan.");
  }

  // 4. Lakukan update
  return prisma.productVariant.update({
    where: { id },
    data: updateRequest,
  });
};

/**
 * Menghapus Varian Produk (Admin Only)
 * @param {Number} variantId - ID varian produk yang akan dihapus
 * @returns {String} - Pesan sukses
 */
const remove = async (variantId) => {
  // 1. Validasi ID varian
  const id = getVariantValidation.parse(variantId);

  // 2. Pastikan varian ada
  const variantExist = await prisma.productVariant.findUnique({
    where: { id },
  });
  if (!variantExist) {
    throw new ResponseError(404, "Varian tidak ditemukan.");
  }

  // 3. Hapus varian dari database
  await prisma.productVariant.delete({
    where: { id },
  });

  return "OK";
};

export default { create, update, remove };

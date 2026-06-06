import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response-error.js";
import { createProductValidation, updateProductValidation, getProductValidation, createVariantValidation, updateVariantValidation, getVariantValidation } from "../validation/product-admin-validation.js";

// ==========================================
// Product Admin Service — Logika bisnis untuk domain Product & Variant (Admin)
// ==========================================

/**
 * Membuat slug ramah URL dari nama produk
 * @param {String} name - Nama produk
 * @returns {String} - Slug produk
 */
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
};

/**
 * Menambahkan Produk Baru (Admin Only)
 * @param {Object} request - Body request dari controller
 * @returns {Object} - Data produk yang berhasil dibuat
 */
const create = async (request) => {
  // 1. Validasi input menggunakan Zod
  const product = createProductValidation.parse(request);

  // 2. Generate slug otomatis
  const slug = generateSlug(product.name);

  // 3. Cek apakah slug sudah terdaftar
  const countProduct = await prisma.product.count({
    where: { slug },
  });

  if (countProduct > 0) {
    throw new ResponseError(400, "Nama produk sudah digunakan (slug duplikat).");
  }

  // 4. Simpan ke database
  return prisma.product.create({
    data: {
      ...product,
      slug,
    },
  });
};

/**
 * Memperbarui Produk (Admin Only)
 * @param {Number} productId - ID produk dari parameter URL
 * @param {Object} request - Body request berisi field yang ingin diupdate
 * @returns {Object} - Data produk yang berhasil diupdate
 */
const update = async (productId, request) => {
  // 1. Validasi parameter ID
  const id = getProductValidation.parse(productId);

  // 2. Validasi body request
  const updateRequest = updateProductValidation.parse(request);

  // 3. Cek eksistensi produk
  const productExist = await prisma.product.findUnique({
    where: { id },
  });

  if (!productExist) {
    throw new ResponseError(404, "Produk tidak ditemukan.");
  }

  const data = { ...updateRequest };

  // 4. Jika nama produk diganti, re-generate slug dan cek keunikan
  if (updateRequest.name) {
    const slug = generateSlug(updateRequest.name);

    const countProduct = await prisma.product.count({
      where: {
        slug,
        NOT: { id },
      },
    });

    if (countProduct === 1) {
      throw new ResponseError(400, "Nama produk sudah digunakan (slug duplikat).");
    }

    data.slug = slug;
  }

  // 5. Simpan perubahan ke database
  return prisma.product.update({
    where: { id },
    data,
  });
};

/**
 * Menonaktifkan produk (soft delete) agar tidak muncul di katalog publik.
 * Data produk tetap ada di database untuk menjaga integritas data historis.
 * Admin bisa mengaktifkan kembali produk dengan PATCH /api/admin/products/:id.
 *
 * @param {Number} productId - ID produk yang akan dinonaktifkan
 * @returns {String} - Pesan sukses
 */
const remove = async (productId) => {
  // 1. Validasi parameter ID
  const id = getProductValidation.parse(productId);

  // 2. Cek eksistensi produk
  const productExist = await prisma.product.findUnique({
    where: { id },
  });

  if (!productExist) {
    throw new ResponseError(404, "Produk tidak ditemukan.");
  }

  // 3. Soft delete: nonaktifkan produk dan semua variannya
  await prisma.$transaction([
    prisma.productVariant.updateMany({
      where: { productId: id },
      data: { isAvailable: false },
    }),
    prisma.product.update({
      where: { id },
      data: { isAvailable: false },
    }),
  ]);

  return "OK";
};

/**
 * Menambahkan Varian Baru ke Produk (Admin Only)
 * @param {Number} productId - ID produk induk
 * @param {Object} request - Body request berisi flavorId, sizeId, price, isAvailable
 * @returns {Object} - Data varian yang berhasil dibuat
 */
const createVariant = async (productId, request) => {
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
  if (countDuplicate > 0) {
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
const updateVariant = async (variantId, request) => {
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
 * Menonaktifkan varian produk (soft delete).
 * Data varian tetap ada di database untuk menjaga integritas data historis.
 * Admin bisa mengaktifkan kembali varian dengan PATCH /api/admin/variants/:id.
 *
 * @param {Number} variantId - ID varian produk yang akan dinonaktifkan
 * @returns {String} - Pesan sukses
 */
const removeVariant = async (variantId) => {
  // 1. Validasi ID varian
  const id = getVariantValidation.parse(variantId);

  // 2. Pastikan varian ada
  const variantExist = await prisma.productVariant.findUnique({
    where: { id },
  });
  if (!variantExist) {
    throw new ResponseError(404, "Varian tidak ditemukan.");
  }

  // 3. Soft delete: nonaktifkan varian
  await prisma.productVariant.update({
    where: { id },
    data: { isAvailable: false },
  });

  return "OK";
};

export default {
  create,
  update,
  remove,
  createVariant,
  updateVariant,
  removeVariant,
};

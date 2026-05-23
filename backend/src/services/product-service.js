import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response-error.js";
import {
  createProductValidation,
  updateProductValidation,
  getProductValidation,
} from "../validation/product-validation.js";

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

  if (countProduct === 1) {
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
 * Menghapus Produk beserta seluruh Varian Terkait (Admin Only)
 * @param {Number} productId - ID produk yang akan dihapus
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

  // 3. Hapus relasi (varian) dan produk secara transaksional
  await prisma.$transaction([
    prisma.productVariant.deleteMany({
      where: { productId: id },
    }),
    prisma.product.delete({
      where: { id },
    }),
  ]);

  return "OK";
};

export default { create, update, remove };

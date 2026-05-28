import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response-error.js";
import { createFlavorValidation, createSizeValidation } from "../validation/master-admin-validation.js";

// ==========================================
// Master Admin Service — Logika bisnis untuk domain Flavor & Size
// ==========================================

/**
 * Menambahkan Rasa Baru (Admin Only)
 * @param {Object} request - Body request dari controller (name)
 * @returns {Object} - Data rasa yang berhasil dibuat
 */
const createFlavor = async (request) => {
  // 1. Validasi input menggunakan Zod
  const flavor = createFlavorValidation.parse(request);

  // 2. Cek apakah nama rasa sudah terdaftar
  const countFlavor = await prisma.flavor.count({
    where: { name: flavor.name },
  });

  if (countFlavor > 0) {
    throw new ResponseError(400, "Rasa sudah ada.");
  }

  // 3. Simpan ke database
  return prisma.flavor.create({
    data: flavor,
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
  });
};

/**
 * Mengambil Daftar Rasa
 * @returns {Array} - List rasa yang terdaftar
 */
const listFlavor = async () => {
  return prisma.flavor.findMany({
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
  });
};

/**
 * Menambahkan Ukuran Baru (Admin Only)
 * @param {Object} request - Body request dari controller (name, description)
 * @returns {Object} - Data ukuran yang berhasil dibuat
 */
const createSize = async (request) => {
  // 1. Validasi input menggunakan Zod
  const size = createSizeValidation.parse(request);

  // 2. Cek apakah ukuran sudah terdaftar
  const countSize = await prisma.size.count({
    where: { name: size.name },
  });

  if (countSize > 0) {
    throw new ResponseError(400, "Ukuran sudah ada.");
  }

  // 3. Simpan ke database
  return prisma.size.create({
    data: size,
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
    },
  });
};

/**
 * Mengambil Daftar Ukuran
 * @returns {Array} - List ukuran yang terdaftar
 */
const listSize = async () => {
  return prisma.size.findMany({
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
    },
  });
};

export default { createFlavor, listFlavor, createSize, listSize };

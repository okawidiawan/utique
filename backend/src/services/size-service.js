import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response-error.js";
import { createSizeValidation } from "../validation/size-validation.js";

/**
 * Menambahkan Ukuran Baru (Admin Only)
 * @param {Object} request - Body request dari controller (name, description)
 * @returns {Object} - Data ukuran yang berhasil dibuat
 */
const create = async (request) => {
  // 1. Validasi input menggunakan Zod
  const size = createSizeValidation.parse(request);

  // 2. Cek apakah ukuran sudah terdaftar
  const countSize = await prisma.size.count({
    where: { name: size.name },
  });

  if (countSize === 1) {
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
const list = async () => {
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

export default { create, list };

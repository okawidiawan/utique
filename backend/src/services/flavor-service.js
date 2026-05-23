import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response-error.js";
import { createFlavorValidation } from "../validation/flavor-validation.js";

/**
 * Menambahkan Rasa Baru (Admin Only)
 * @param {Object} request - Body request dari controller (name)
 * @returns {Object} - Data rasa yang berhasil dibuat
 */
const create = async (request) => {
  // 1. Validasi input menggunakan Zod
  const flavor = createFlavorValidation.parse(request);

  // 2. Cek apakah nama rasa sudah terdaftar
  const countFlavor = await prisma.flavor.count({
    where: { name: flavor.name },
  });

  if (countFlavor === 1) {
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
const list = async () => {
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

export default { create, list };

import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response-error.js";
import {
  createAddressValidation,
  updateAddressValidation,
} from "../validation/address-validation.js";

/**
 * Tambah Alamat Baru
 * @param {Number} userId - ID user
 * @param {Object} request - Body request dari controller
 * @returns {String} - Pesan sukses
 */
const create = async (userId, request) => {
  const addressRequest = createAddressValidation.parse(request);

  if (addressRequest.isDefault) {
    await prisma.address.updateMany({
      where: { userId: userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  await prisma.address.create({
    data: {
      ...addressRequest,
      userId: userId,
    },
  });

  return "OK";
};

/**
 * Ambil Daftar Alamat User
 * @param {Number} userId - ID user
 * @returns {Array} - Array of addresses
 */
const list = async (userId) => {
  return prisma.address.findMany({
    where: { userId: userId },
    orderBy: [
      { isDefault: "desc" },
      { createdAt: "desc" },
    ],
  });
};

/**
 * Perbarui Alamat
 * @param {Number} userId - ID user
 * @param {Number} addressId - ID alamat
 * @param {Object} request - Data yang diubah
 * @returns {Object} - Alamat yang sudah diperbarui
 */
const update = async (userId, addressId, request) => {
  const updateRequest = updateAddressValidation.parse(request);

  if (updateRequest.isDefault) {
    await prisma.address.updateMany({
      where: { userId: userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  try {
    return await prisma.address.update({
      where: { id: addressId, userId: userId }, // Compound where
      data: updateRequest,
    });
  } catch (error) {
    if (error.code === "P2025") {
      throw new ResponseError(404, "Alamat tidak ditemukan.");
    }
    throw error;
  }
};

/**
 * Hapus Alamat
 * @param {Number} userId - ID user
 * @param {Number} addressId - ID alamat
 * @returns {String} - Pesan sukses
 */
const remove = async (userId, addressId) => {
  const countAddress = await prisma.address.count({
    where: {
      id: addressId,
      userId: userId,
    },
  });

  if (countAddress !== 1) {
    throw new ResponseError(404, "Alamat tidak ditemukan.");
  }

  await prisma.address.delete({
    where: { id: addressId },
  });

  return "OK";
};

export default {
  create,
  list,
  update,
  remove,
};

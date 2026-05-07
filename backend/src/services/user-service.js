import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response-error.js";
import {
  registerUserValidation,
  loginUserValidation,
  updateUserValidation,
} from "../validation/user-validation.js";

/**
 * Registrasi User Baru
 * @param {Object} request - Body request dari controller
 * @returns {Object} - Data user yang berhasil didaftarkan
 */
const register = async (request) => {
  // 1. Validasi input
  const user = registerUserValidation.parse(request);

  // 2. Cek apakah email sudah terdaftar
  const countUser = await prisma.user.count({
    where: { email: user.email },
  });

  if (countUser === 1) {
    throw new ResponseError(400, "Email sudah terdaftar.");
  }

  // 3. Hash password
  user.password = await bcrypt.hash(user.password, 10);

  // 4. Simpan ke database
  return prisma.user.create({
    data: user,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });
};

/**
 * Login User
 * @param {Object} request - Body request (email & password)
 * @returns {Object} - Data user beserta token
 */
const login = async (request) => {
  // 1. Validasi input
  const loginRequest = loginUserValidation.parse(request);

  // 2. Cari user berdasarkan email
  const user = await prisma.user.findUnique({
    where: { email: loginRequest.email },
  });

  if (!user) {
    throw new ResponseError(401, "Email atau password salah.");
  }

  // 3. Bandingkan password
  const isPasswordValid = await bcrypt.compare(
    loginRequest.password,
    user.password
  );
  if (!isPasswordValid) {
    throw new ResponseError(401, "Email atau password salah.");
  }

  // 4. Generate token
  const token = uuid();

  // 5. Update token di database
  return prisma.user.update({
    where: { id: user.id },
    data: { token },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      token: true,
    },
  });
};

/**
 * Mengambil Profil User yang Sedang Login
 * @param {Number} userId - ID user dari auth middleware
 * @returns {Object} - Data profil user
 */
const get = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new ResponseError(404, "User tidak ditemukan.");
  }

  return user;
};

/**
 * Memperbarui Profil User
 * @param {Number} userId - ID user dari auth middleware
 * @param {Object} request - Data yang ingin diubah
 * @returns {Object} - Data user yang sudah diupdate
 */
const update = async (userId, request) => {
  // 1. Validasi input
  const updateRequest = updateUserValidation.parse(request);

  // 2. Cek apakah ada field yang diisi
  if (Object.keys(updateRequest).length === 0) {
    throw new ResponseError(400, "Minimal satu field harus diisi untuk update.");
  }

  const data = {};

  // 3. Jika ganti nama
  if (updateRequest.name) {
    data.name = updateRequest.name;
  }

  // 4. Jika ganti email
  if (updateRequest.email) {
    // Cek apakah email sudah digunakan user lain
    const countUser = await prisma.user.count({
      where: {
        email: updateRequest.email,
        NOT: { id: userId },
      },
    });

    if (countUser === 1) {
      throw new ResponseError(400, "Email sudah digunakan.");
    }
    data.email = updateRequest.email;
  }

  // 5. Jika ganti password
  if (updateRequest.password) {
    data.password = await bcrypt.hash(updateRequest.password, 10);
  }

  // 6. Jika ganti phone
  if (updateRequest.phone !== undefined) {
    data.phone = updateRequest.phone;
  }

  // 7. Update ke database
  return prisma.user.update({
    where: { id: userId },
    data: data,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

/**
 * Logout User
 * @param {Number} userId - ID user dari auth middleware
 * @returns {String} - Pesan sukses
 */
const logout = async (userId) => {
  await prisma.user.update({
    where: { id: userId },
    data: { token: null },
  });

  return "Berhasil logout.";
};

export default { register, login, get, update, logout };

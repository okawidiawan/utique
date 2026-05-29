import { prisma } from "../src/application/database.js";
import bcrypt from "bcrypt";

export const removeTestUser = async () => {
  await prisma.user.deleteMany({});
};

export const createTestUser = async () => {
  await prisma.user.create({
    data: {
      name: "Test User",
      email: "test@example.com",
      password: await bcrypt.hash("rahasia123", 10),
      token: "test-token",
    },
  });
};

export const getTestUser = async () => {
  return prisma.user.findUnique({
    where: {
      email: "test@example.com",
    },
  });
};

export const createTestAdmin = async () => {
  await prisma.user.create({
    data: {
      name: "Test Admin",
      email: "admin@example.com",
      password: await bcrypt.hash("rahasia123", 10),
      token: "admin-token",
      role: "ADMIN",
    },
  });
};

export const getTestAdmin = async () => {
  return prisma.user.findUnique({
    where: {
      email: "admin@example.com",
    },
  });
};

export const removeAllFlavors = async () => {
  await prisma.flavor.deleteMany({});
};

export const createTestFlavor = async () => {
  return prisma.flavor.create({
    data: {
      name: "Test Flavor Original",
    },
  });
};

export const removeAllSizes = async () => {
  await prisma.size.deleteMany({});
};

export const createTestSize = async () => {
  return prisma.size.create({
    data: {
      name: "Test Size Small",
      description: "10pcs",
    },
  });
};

export const removeAllProducts = async () => {
  await prisma.product.deleteMany({});
};

export const createTestProduct = async () => {
  return prisma.product.create({
    data: {
      name: "Test Product Cookies",
      slug: "test-product-cookies",
      description: "Delicious test cookies",
      imageUrl: "http://example.com/image.jpg",
      productionTimeDays: 2,
      isAvailable: true,
    },
  });
};

export const removeAllVariants = async () => {
  await prisma.productVariant.deleteMany({});
};

export const createTestVariant = async (productId, flavorId, sizeId) => {
  return prisma.productVariant.create({
    data: {
      productId,
      flavorId,
      sizeId,
      price: 25000,
      isAvailable: true,
    },
  });
};

export const removeTestAddresses = async () => {
  await prisma.address.deleteMany({});
};

export const createTestAddress = async (userId, customData = {}) => {
  return prisma.address.create({
    data: {
      userId,
      label: "Rumah Test",
      recipientName: "Penerima Test",
      phone: "081234567890",
      province: "Provinsi Test",
      city: "Kota Test",
      district: "Kecamatan Test",
      postalCode: "12345",
      fullAddress: "Alamat Lengkap Test",
      isDefault: false,
      ...customData
    }
  });
};

export const removeTestCart = async () => {
  await prisma.cartItem.deleteMany({});
  await prisma.cart.deleteMany({});
};

export const createTestCart = async (userId) => {
  return prisma.cart.create({
    data: {
      userId,
    },
  });
};

export const createTestCartItem = async (cartId, productVariantId, quantity = 1) => {
  return prisma.cartItem.create({
    data: {
      cartId,
      productVariantId,
      quantity,
    },
  });
};

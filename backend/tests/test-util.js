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


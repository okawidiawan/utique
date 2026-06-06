import { prisma } from "../src/application/database.js";
import bcrypt from "bcrypt";

export const TEST_USER_EMAIL = "test@example.com";
export const TEST_ADMIN_EMAIL = "admin@example.com";

export const removeTestUser = async () => {
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { in: [TEST_USER_EMAIL, TEST_ADMIN_EMAIL] } },
        { email: { contains: "test" } },
        { email: { endsWith: "@example.com" } },
      ],
    },
  });
};

export const createTestUser = async () => {
  const tokenExpiredAt = new Date();
  tokenExpiredAt.setDate(tokenExpiredAt.getDate() + 7);

  await prisma.user.create({
    data: {
      name: "Test User",
      email: TEST_USER_EMAIL,
      password: await bcrypt.hash("rahasia123", 10),
      token: "test-token",
      tokenExpiredAt,
    },
  });
};

export const getTestUser = async () => {
  return prisma.user.findUnique({
    where: {
      email: TEST_USER_EMAIL,
    },
  });
};

export const createTestAdmin = async () => {
  const tokenExpiredAt = new Date();
  tokenExpiredAt.setDate(tokenExpiredAt.getDate() + 7);

  await prisma.user.create({
    data: {
      name: "Test Admin",
      email: TEST_ADMIN_EMAIL,
      password: await bcrypt.hash("rahasia123", 10),
      token: "admin-token",
      role: "ADMIN",
      tokenExpiredAt,
    },
  });
};


export const getTestAdmin = async () => {
  return prisma.user.findUnique({
    where: {
      email: TEST_ADMIN_EMAIL,
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

export const removeTestOrders = async () => {
  await prisma.productionQueue.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
};

export const createTestOrder = async (userId, addressId, productVariantId) => {
  return prisma.order.create({
    data: {
      orderNumber: `UTQ-TEST-${Date.now()}`,
      userId,
      addressId,
      totalPrice: 25000,
      grandTotal: 25000,
      paymentDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      items: {
        create: {
          productVariantId,
          productName: "Test Product",
          flavorName: "Test Flavor",
          sizeName: "Test Size",
          price: 25000,
          quantity: 1,
          subtotal: 25000
        }
      }
    }
  });
};

export const masterCleanup = async () => {
  await prisma.productionQueue.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.cart.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.flavor.deleteMany({});
  await prisma.size.deleteMany({});
  await removeTestUser();
};

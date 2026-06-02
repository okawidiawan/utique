import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import request from "supertest";
import { web } from "../src/application/web.js";
import {
  createTestUser,
  removeTestUser,
  createTestProduct,
  createTestFlavor,
  createTestSize,
  createTestVariant,
  createTestAddress,
  removeTestOrders,
  removeAllProducts,
  removeAllVariants,
  removeAllFlavors,
  removeAllSizes,
  removeTestAddresses,
  removeTestCart,
  getTestUser,
} from "./test-util.js";
import { prisma } from "../src/application/database.js";

describe("Payment API (Customer)", () => {
  let user;
  let orderId;

  beforeEach(async () => {
    await removeTestOrders();
    await removeTestCart();
    await removeTestAddresses();
    await removeAllVariants();
    await removeAllProducts();
    await removeAllFlavors();
    await removeAllSizes();
    await removeTestUser();

    await createTestUser();
    user = await getTestUser();

    const product = await createTestProduct();
    const flavor = await createTestFlavor();
    const size = await createTestSize();
    const variant = await createTestVariant(product.id, flavor.id, size.id);
    const address = await createTestAddress(user.id);

    // Persiapkan order PENDING_PAYMENT
    await prisma.cart.create({ data: { userId: user.id } });
    const cart = await prisma.cart.findUnique({ where: { userId: user.id } });
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productVariantId: variant.id,
        quantity: 1,
      },
    });

    const orderResponse = await request(web)
      .post("/api/orders")
      .set("Authorization", "Bearer test-token")
      .send({
        address_id: address.id,
        shipping_courier: "JNE",
      });

    orderId = orderResponse.body.data.id;
  });

  afterEach(async () => {
    await removeTestOrders();
    await removeTestCart();
    await removeTestAddresses();
    await removeAllVariants();
    await removeAllProducts();
    await removeAllFlavors();
    await removeAllSizes();
    await removeTestUser();
  });

  describe("POST /api/orders/:orderId/payment", () => {
    it("should be able to upload payment proof", async () => {
      const result = await request(web)
        .post(`/api/orders/${orderId}/payment`)
        .set("Authorization", "Bearer test-token")
        .attach("proof_image", Buffer.from("fake-image-content"), "proof.jpg");

      expect(result.status).toBe(201);
      expect(result.body.data.id).toBeDefined();
      expect(result.body.data.orderId).toBe(orderId);
      expect(result.body.data.proofImageUrl).toBe("https://res.cloudinary.com/mock/image.jpg");
      expect(result.body.data.status).toBe("PENDING");

      const payment = await prisma.payment.findUnique({
        where: { orderId: orderId },
      });
      expect(payment).toBeDefined();
      expect(payment.status).toBe("PENDING");
    });

    it("should reject if token is missing", async () => {
      const result = await request(web)
        .post(`/api/orders/${orderId}/payment`)
        .attach("proof_image", Buffer.from("fake-image"), "proof.jpg");

      expect(result.status).toBe(401);
    });

    it("should reject if order not found or not belongs to user", async () => {
      const result = await request(web)
        .post(`/api/orders/999999/payment`)
        .set("Authorization", "Bearer test-token")
        .attach("proof_image", Buffer.from("fake-image"), "proof.jpg");

      expect(result.status).toBe(404);
      expect(result.body.error).toBe("Pesanan tidak ditemukan.");
    });

    it("should reject if order status is not PENDING_PAYMENT", async () => {
      // Update status order menjadi PAID (sudah lunas)
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "PAID" },
      });

      const result = await request(web)
        .post(`/api/orders/${orderId}/payment`)
        .set("Authorization", "Bearer test-token")
        .attach("proof_image", Buffer.from("fake-image"), "proof.jpg");

      expect(result.status).toBe(400);
      expect(result.body.error).toBe("Pesanan ini tidak menunggu pembayaran.");
    });

    it("should reject if payment deadline is passed", async () => {
      // Set deadline ke masa lalu
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentDeadline: new Date(Date.now() - 1000) },
      });

      const result = await request(web)
        .post(`/api/orders/${orderId}/payment`)
        .set("Authorization", "Bearer test-token")
        .attach("proof_image", Buffer.from("fake-image"), "proof.jpg");

      expect(result.status).toBe(400);
      expect(result.body.error).toBe("Batas waktu pembayaran sudah habis.");
    });

    it("should reject if payment already uploaded and PENDING", async () => {
      // Upload pertama
      await request(web)
        .post(`/api/orders/${orderId}/payment`)
        .set("Authorization", "Bearer test-token")
        .attach("proof_image", Buffer.from("fake-image"), "proof.jpg");

      // Upload kedua (status order masih PENDING_PAYMENT, tapi sudah ada payment PENDING)
      const result = await request(web)
        .post(`/api/orders/${orderId}/payment`)
        .set("Authorization", "Bearer test-token")
        .attach("proof_image", Buffer.from("fake-image"), "proof.jpg");

      expect(result.status).toBe(400);
      expect(result.body.error).toBe("Bukti pembayaran sudah pernah diupload.");
    });

    it("should reject if no file uploaded", async () => {
      const result = await request(web)
        .post(`/api/orders/${orderId}/payment`)
        .set("Authorization", "Bearer test-token");
        // Tidak attach file apapun

      expect(result.status).toBe(400);
      expect(result.body.error).toBe("Bukti pembayaran wajib diupload.");
    });

    it("should be able to upload again if previous payment was REJECTED", async () => {
      // Upload pertama
      await request(web)
        .post(`/api/orders/${orderId}/payment`)
        .set("Authorization", "Bearer test-token")
        .attach("proof_image", Buffer.from("fake-image"), "proof.jpg");

      // Admin menolak payment tersebut
      const payment = await prisma.payment.findUnique({ where: { orderId: orderId } });
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "REJECTED", rejectReason: "Foto buram" },
      });

      // Upload kedua harusnya bisa
      const result = await request(web)
        .post(`/api/orders/${orderId}/payment`)
        .set("Authorization", "Bearer test-token")
        .attach("proof_image", Buffer.from("fake-image-2"), "proof2.jpg");

      expect(result.status).toBe(201);
      expect(result.body.data.status).toBe("PENDING");
    });
  });
});

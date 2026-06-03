import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import request from "supertest";
import { web } from "../src/application/web.js";
import { prisma } from "../src/application/database.js";
import {
  removeTestUser,
  createTestUser,
  getTestUser,
  createTestAdmin,
  getTestAdmin,
  removeAllFlavors,
  createTestFlavor,
  removeAllSizes,
  createTestSize,
  removeAllProducts,
  createTestProduct,
  removeAllVariants,
  createTestVariant,
  removeTestAddresses,
  createTestAddress,
  removeTestOrders,
} from "./test-util.js";

describe("Admin Order API", () => {
  beforeEach(async () => {
    await removeTestOrders();
    await removeTestAddresses();
    await removeAllVariants();
    await removeAllProducts();
    await removeAllFlavors();
    await removeAllSizes();
    await removeTestUser();
  });

  afterEach(async () => {
    await removeTestOrders();
    await removeTestAddresses();
    await removeAllVariants();
    await removeAllProducts();
    await removeAllFlavors();
    await removeAllSizes();
    await removeTestUser();
  });

  const setupOrder = async (status = "PAID", orderNumber = null) => {
    let user = await getTestUser();
    if (!user) {
      await createTestUser();
      user = await getTestUser();
    }

    const uniqueId = Math.random().toString(36).substring(7);

    const flavor = await prisma.flavor.create({
      data: { name: `Flavor-${uniqueId}` },
    });
    const size = await prisma.size.create({
      data: { name: `Size-${uniqueId}` },
    });
    const product = await prisma.product.create({
      data: {
        name: `Product-${uniqueId}`,
        slug: `slug-${uniqueId}`,
        productionTimeDays: 2,
        isAvailable: true,
      },
    });

    const variant = await createTestVariant(product.id, flavor.id, size.id);
    const address = await createTestAddress(user.id);

    const order = await prisma.order.create({
      data: {
        orderNumber: orderNumber || `UTQ-TEST-${uniqueId}`,
        userId: user.id,
        addressId: address.id,
        status: status,
        totalPrice: 50000,
        grandTotal: 50000,
        paymentDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
        items: {
          create: [
            {
              productVariantId: variant.id,
              productName: product.name,
              flavorName: flavor.name,
              sizeName: size.name,
              price: 25000,
              quantity: 2,
              subtotal: 50000,
            },
          ],
        },
      },
    });

    if (status === "PAID") {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          status: "VERIFIED",
          proofImageUrl: "http://example.com/proof.jpg",
          adminNotes: "Sudah masuk",
          verifiedAt: new Date(),
        },
      });
    }

    return order;
  };

  describe("GET /api/admin/orders", () => {
    it("should be able to list all orders", async () => {
      await createTestAdmin();
      const admin = await getTestAdmin();
      await setupOrder("PAID");
      await setupOrder("PENDING_PAYMENT");

      const result = await request(web)
        .get("/api/admin/orders")
        .set("Authorization", `Bearer ${admin.token}`);

      expect(result.status).toBe(200);
      expect(result.body.data.length).toBe(2);
      expect(result.body.paging.total_item).toBe(2);
    });

    it("should be able to filter orders by status", async () => {
      await createTestAdmin();
      const admin = await getTestAdmin();
      await setupOrder("PAID");
      await setupOrder("PENDING_PAYMENT");

      const result = await request(web)
        .get("/api/admin/orders?status=PAID")
        .set("Authorization", `Bearer ${admin.token}`);

      expect(result.status).toBe(200);
      expect(result.body.data.length).toBe(1);
      expect(result.body.data[0].status).toBe("PAID");
    });

    it("should reject if status is invalid", async () => {
      await createTestAdmin();
      const admin = await getTestAdmin();

      const result = await request(web)
        .get("/api/admin/orders?status=INVALID")
        .set("Authorization", `Bearer ${admin.token}`);

      expect(result.status).toBe(400);
      expect(result.body.error).toBe("Status tidak valid");
    });

    it("should reject if not admin", async () => {
      await createTestUser();
      const user = await getTestUser();

      const result = await request(web)
        .get("/api/admin/orders")
        .set("Authorization", `Bearer ${user.token}`);

      expect(result.status).toBe(403);
    });
  });

  describe("GET /api/admin/orders/:id", () => {
    it("should be able to get order detail", async () => {
      await createTestAdmin();
      const admin = await getTestAdmin();
      const order = await setupOrder("PAID");

      const result = await request(web)
        .get(`/api/admin/orders/${order.id}`)
        .set("Authorization", `Bearer ${admin.token}`);

      expect(result.status).toBe(200);
      expect(result.body.data.id).toBe(order.id);
      expect(result.body.data.user).toBeDefined();
      expect(result.body.data.address).toBeDefined();
      expect(result.body.data.items.length).toBe(1);
      expect(result.body.data.payment).toBeDefined();
    });

    it("should return 404 if order not found", async () => {
      await createTestAdmin();
      const admin = await getTestAdmin();

      const result = await request(web)
        .get("/api/admin/orders/9999")
        .set("Authorization", `Bearer ${admin.token}`);

      expect(result.status).toBe(404);
      expect(result.body.error).toBe("Order tidak ditemukan");
    });
  });

  describe("PATCH /api/admin/orders/:id/status", () => {
    it("should be able to update status from PAID to IN_QUEUE", async () => {
      await createTestAdmin();
      const admin = await getTestAdmin();
      const order = await setupOrder("PAID");

      const result = await request(web)
        .patch(`/api/admin/orders/${order.id}/status`)
        .set("Authorization", `Bearer ${admin.token}`)
        .send({ status: "IN_QUEUE" });

      expect(result.status).toBe(200);
      expect(result.body.data.status).toBe("IN_QUEUE");
    });

    it("should reject invalid transition", async () => {
      await createTestAdmin();
      const admin = await getTestAdmin();
      const order = await setupOrder("PAID");

      const result = await request(web)
        .patch(`/api/admin/orders/${order.id}/status`)
        .set("Authorization", `Bearer ${admin.token}`)
        .send({ status: "SHIPPED" });

      expect(result.status).toBe(400);
      expect(result.body.error).toBe("Transisi status tidak valid");
    });
  });

  describe("PATCH /api/admin/orders/:id/shipping", () => {
    it("should be able to input shipping info when status is DONE", async () => {
      await createTestAdmin();
      const admin = await getTestAdmin();
      const order = await setupOrder("DONE");

      const result = await request(web)
        .patch(`/api/admin/orders/${order.id}/shipping`)
        .set("Authorization", `Bearer ${admin.token}`)
        .send({
          shipping_tracking_number: "RESI123",
          shipping_courier: "JNE",
        });

      expect(result.status).toBe(200);
      expect(result.body.data.shipping_tracking_number).toBe("RESI123");
      expect(result.body.data.shipping_courier).toBe("JNE");
    });

    it("should reject if status is not DONE or SHIPPED", async () => {
      await createTestAdmin();
      const admin = await getTestAdmin();
      const order = await setupOrder("PAID");

      const result = await request(web)
        .patch(`/api/admin/orders/${order.id}/shipping`)
        .set("Authorization", `Bearer ${admin.token}`)
        .send({
          shipping_tracking_number: "RESI123",
          shipping_courier: "JNE",
        });

      expect(result.status).toBe(400);
      expect(result.body.error).toBe("Resi hanya bisa diinput pada status DONE atau SHIPPED");
    });
  });

  describe("PATCH /api/admin/orders/:id/estimation", () => {
    it("should be able to update estimation when status is IN_QUEUE", async () => {
      await createTestAdmin();
      const admin = await getTestAdmin();
      const order = await setupOrder("IN_QUEUE");

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const dateStr = nextWeek.toISOString().split("T")[0];

      const result = await request(web)
        .patch(`/api/admin/orders/${order.id}/estimation`)
        .set("Authorization", `Bearer ${admin.token}`)
        .send({
          estimated_completion_date: dateStr,
        });

      expect(result.status).toBe(200);
      expect(result.body.data.estimated_completion_date).toBe(dateStr);
    });

    it("should reject if date is in the past", async () => {
      await createTestAdmin();
      const admin = await getTestAdmin();
      const order = await setupOrder("IN_QUEUE");

      const result = await request(web)
        .patch(`/api/admin/orders/${order.id}/estimation`)
        .set("Authorization", `Bearer ${admin.token}`)
        .send({
          estimated_completion_date: "2020-01-01",
        });

      expect(result.status).toBe(400);
      expect(result.body.error).toBe("Estimasi tidak boleh di masa lalu");
    });

    it("should reject if status is not IN_QUEUE or IN_PRODUCTION", async () => {
      await createTestAdmin();
      const admin = await getTestAdmin();
      const order = await setupOrder("PAID");

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const dateStr = nextWeek.toISOString().split("T")[0];

      const result = await request(web)
        .patch(`/api/admin/orders/${order.id}/estimation`)
        .set("Authorization", `Bearer ${admin.token}`)
        .send({
          estimated_completion_date: dateStr,
        });

      expect(result.status).toBe(400);
      expect(result.body.error).toBe(
        "Estimasi hanya bisa diubah pada status IN_QUEUE atau IN_PRODUCTION"
      );
    });
  });
});

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import request from "supertest";
import { web } from "../src/application/web.js";
import {
  createTestUser,
  createTestAdmin,
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
} from "./test-util.js";
import { prisma } from "../src/application/database.js";

describe("Payment API (Admin)", () => {
  let admin;
  let paymentId;
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

    await createTestAdmin();
    admin = await prisma.user.findUnique({ where: { email: "admin@example.com" } });
    
    await createTestUser();
    const user = await prisma.user.findUnique({ where: { email: "test@example.com" } });

    const product = await createTestProduct();
    const flavor = await createTestFlavor();
    const size = await createTestSize();
    const variant = await createTestVariant(product.id, flavor.id, size.id);
    const address = await createTestAddress(user.id);

    // Create Order directly via Prisma
    const order = await prisma.order.create({
      data: {
        orderNumber: "UTQ-TEST-001",
        userId: user.id,
        addressId: address.id,
        totalPrice: 25000,
        grandTotal: 25000,
        paymentDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: "PENDING_PAYMENT"
      }
    });
    orderId = order.id;

    // Create Payment directly via Prisma
    const payment = await prisma.payment.create({
      data: {
        orderId: orderId,
        proofImageUrl: "http://example.com/proof.jpg",
        status: "PENDING"
      }
    });
    paymentId = payment.id;
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

  describe("PATCH /api/admin/payments/:id/verify", () => {
    it("should be able to verify payment", async () => {
      const result = await request(web)
        .patch(`/api/admin/payments/${paymentId}/verify`)
        .set("Authorization", "Bearer admin-token")
        .send({
          notes: "Pembayaran sudah masuk Rp 25.000"
        });

      expect(result.status).toBe(200);
      expect(result.body.data).toBe("Pembayaran berhasil diverifikasi.");

      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(payment.status).toBe("VERIFIED");
      expect(payment.adminNotes).toBe("Pembayaran sudah masuk Rp 25.000");

      const order = await prisma.order.findUnique({ where: { id: orderId } });
      expect(order.status).toBe("PAID");
    });

    it("should reject verify if not admin", async () => {
      const result = await request(web)
        .patch(`/api/admin/payments/${paymentId}/verify`)
        .set("Authorization", "Bearer test-token")
        .send({ notes: "Verify" });

      expect(result.status).toBe(403);
      expect(result.body.error).toBe("Akses ditolak. Anda tidak memiliki izin admin.");
    });

    it("should reject verify if payment not found", async () => {
      const result = await request(web)
        .patch(`/api/admin/payments/99999/verify`)
        .set("Authorization", "Bearer admin-token")
        .send({ notes: "Verify" });

      expect(result.status).toBe(404);
      expect(result.body.error).toBe("Data pembayaran tidak ditemukan.");
    });

    it("should reject verify if payment is not PENDING", async () => {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: "VERIFIED" }
      });

      const result = await request(web)
        .patch(`/api/admin/payments/${paymentId}/verify`)
        .set("Authorization", "Bearer admin-token")
        .send({ notes: "Verify" });

      expect(result.status).toBe(400);
      expect(result.body.error).toBe("Pembayaran ini sudah diproses sebelumnya.");
    });
  });

  describe("PATCH /api/admin/payments/:id/reject", () => {
    it("should be able to reject payment", async () => {
      const result = await request(web)
        .patch(`/api/admin/payments/${paymentId}/reject`)
        .set("Authorization", "Bearer admin-token")
        .send({
          reason: "Nominal transfer kurang"
        });

      expect(result.status).toBe(200);
      expect(result.body.data).toBe("Pembayaran ditolak.");

      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(payment.status).toBe("REJECTED");
      expect(payment.rejectReason).toBe("Nominal transfer kurang");

      const order = await prisma.order.findUnique({ where: { id: orderId } });
      expect(order.status).toBe("PENDING_PAYMENT");
    });

    it("should reject reject if reason is missing", async () => {
      const result = await request(web)
        .patch(`/api/admin/payments/${paymentId}/reject`)
        .set("Authorization", "Bearer admin-token")
        .send({});

      expect(result.status).toBe(400);
      // Mendukung pesan kustom atau pesan default Zod
      expect(result.body.error).toMatch(/Alasan penolakan wajib diisi|Invalid input/);
    });

    it("should reject reject if payment is not PENDING", async () => {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: "REJECTED", rejectReason: "Old reason" }
      });

      const result = await request(web)
        .patch(`/api/admin/payments/${paymentId}/reject`)
        .set("Authorization", "Bearer admin-token")
        .send({ reason: "New reason" });

      expect(result.status).toBe(400);
      expect(result.body.error).toBe("Pembayaran ini sudah diproses sebelumnya.");
    });

    it("should reject reject if not admin", async () => {
      const result = await request(web)
        .patch(`/api/admin/payments/${paymentId}/reject`)
        .set("Authorization", "Bearer test-token")
        .send({ reason: "Reject" });

      expect(result.status).toBe(403);
    });
  });
});

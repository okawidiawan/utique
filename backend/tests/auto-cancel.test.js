import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { prisma } from "../src/application/database.js";
import { runAutoCancelJob } from "../src/jobs/auto-cancel-job.js";
import {
  masterCleanup,
  createTestUser,
  getTestUser,
  createTestProduct,
  createTestFlavor,
  createTestSize,
  createTestVariant,
  createTestAddress,
} from "./test-util.js";

describe("Auto-Cancel Job", () => {
  beforeEach(async () => {
    await masterCleanup();
    await createTestUser();
  });

  afterEach(async () => {
    await masterCleanup();
  });

  it("should cancel expired orders and remove them from production queue", async () => {
    const user = await getTestUser();
    const product = await createTestProduct();
    const flavor = await createTestFlavor();
    const size = await createTestSize();
    const variant = await createTestVariant(product.id, flavor.id, size.id);
    const address = await createTestAddress(user.id);

    // Create an expired order
    const expiredOrder = await prisma.order.create({
      data: {
        orderNumber: "UTQ-EXPIRED-001",
        userId: user.id,
        addressId: address.id,
        totalPrice: 25000,
        grandTotal: 25000,
        status: "PENDING_PAYMENT",
        paymentDeadline: new Date(Date.now() - 1000), // 1 second ago
        items: {
          create: {
            productVariantId: variant.id,
            productName: product.name,
            flavorName: flavor.name,
            sizeName: size.name,
            price: variant.price,
            quantity: 1,
            subtotal: variant.price,
          },
        },
      },
    });

    // Add to production queue
    await prisma.productionQueue.create({
      data: {
        orderId: expiredOrder.id,
        productionDate: new Date(),
        queuePosition: 1,
      },
    });

    // Create a non-expired order
    const validOrder = await prisma.order.create({
      data: {
        orderNumber: "UTQ-VALID-001",
        userId: user.id,
        addressId: address.id,
        totalPrice: 25000,
        grandTotal: 25000,
        status: "PENDING_PAYMENT",
        paymentDeadline: new Date(Date.now() + 3600000), // 1 hour later
        items: {
          create: {
            productVariantId: variant.id,
            productName: product.name,
            flavorName: flavor.name,
            sizeName: size.name,
            price: variant.price,
            quantity: 1,
            subtotal: variant.price,
          },
        },
      },
    });

    // Run the job
    await runAutoCancelJob();

    // Check results
    const cancelledOrder = await prisma.order.findUnique({
      where: { id: expiredOrder.id },
    });
    expect(cancelledOrder.status).toBe("CANCELLED");
    expect(cancelledOrder.cancelReason).toBe("Batas waktu pembayaran habis (otomatis).");

    const activeOrder = await prisma.order.findUnique({
      where: { id: validOrder.id },
    });
    expect(activeOrder.status).toBe("PENDING_PAYMENT");

    const queueEntry = await prisma.productionQueue.findUnique({
      where: { orderId: expiredOrder.id },
    });
    expect(queueEntry).toBeNull();
  });

  it("should not cancel PAID orders even if deadline is passed", async () => {
    const user = await getTestUser();
    const product = await createTestProduct();
    const flavor = await createTestFlavor();
    const size = await createTestSize();
    const variant = await createTestVariant(product.id, flavor.id, size.id);
    const address = await createTestAddress(user.id);

    // Create a PAID order with passed deadline
    const paidOrder = await prisma.order.create({
      data: {
        orderNumber: "UTQ-PAID-001",
        userId: user.id,
        addressId: address.id,
        totalPrice: 25000,
        grandTotal: 25000,
        status: "PAID",
        paymentDeadline: new Date(Date.now() - 1000),
        items: {
          create: {
            productVariantId: variant.id,
            productName: product.name,
            flavorName: flavor.name,
            sizeName: size.name,
            price: variant.price,
            quantity: 1,
            subtotal: variant.price,
          },
        },
      },
    });

    await runAutoCancelJob();

    const order = await prisma.order.findUnique({
      where: { id: paidOrder.id },
    });
    expect(order.status).toBe("PAID");
  });
});

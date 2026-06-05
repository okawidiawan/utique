import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import request from "supertest";
import { web } from "../src/application/web.js";
import { prisma } from "../src/application/database.js";
import {
  removeTestUser,
  createTestUser,
  getTestUser,
  removeAllFlavors,
  createTestFlavor,
  removeAllSizes,
  createTestSize,
  removeAllProducts,
  createTestProduct,
  removeAllVariants,
  createTestVariant,
  removeTestCart,
  createTestCart,
  createTestCartItem,
  removeTestAddresses,
  createTestAddress,
  removeTestOrders,
  createTestOrder,
} from "./test-util.js";

describe("Order API", () => {
  beforeEach(async () => {
    await removeTestOrders();
    await removeTestCart();
    await removeTestAddresses();
    await removeAllVariants();
    await removeAllProducts();
    await removeAllFlavors();
    await removeAllSizes();
    await removeTestUser();
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

  describe("POST /api/orders", () => {
    it("should be able to create order from cart", async () => {
      await createTestUser();
      const user = await getTestUser();
      const flavor = await createTestFlavor();
      const size = await createTestSize();
      const product = await createTestProduct();
      const variant = await createTestVariant(product.id, flavor.id, size.id);

      const cart = await createTestCart(user.id);
      await createTestCartItem(cart.id, variant.id, 2);

      const address = await createTestAddress(user.id);

      const result = await request(web).post("/api/orders").set("Authorization", `Bearer ${user.token}`).send({
        address_id: address.id,
        shipping_courier: "JNE",
      });

      expect(result.status).toBe(201);
      expect(result.body.data.orderNumber).toBeDefined();
      expect(result.body.data.totalPrice).toBe(variant.price * 2);
      expect(result.body.data.status).toBe("PENDING_PAYMENT");
      expect(result.body.data.items.length).toBe(1);
      expect(result.body.data.items[0].productName).toBe(product.name);
      expect(result.body.data.addressId).toBe(address.id);

      // Cart should be empty
      const cartItems = await prisma.cartItem.findMany({ where: { cartId: cart.id } });
      expect(cartItems.length).toBe(0);

      // Verify ProductionQueue
      const queue = await prisma.productionQueue.findFirst({
        where: { orderId: result.body.data.id }
      });
      expect(queue).toBeDefined();
      expect(queue.queuePosition).toBe(1);
    });

    it("should move production date to next day if capacity is full", async () => {
      await createTestUser();
      const user = await getTestUser();
      const flavor = await createTestFlavor();
      const size = await createTestSize();
      const product = await createTestProduct();
      const variant = await createTestVariant(product.id, flavor.id, size.id);
      const address = await createTestAddress(user.id);
      const cart = await createTestCart(user.id);

      // Create 10 orders manually in the queue for the same date
      const prodDate = new Date();
      prodDate.setDate(prodDate.getDate() + product.productionTimeDays);
      prodDate.setHours(0, 0, 0, 0);

      for (let i = 1; i <= 10; i++) {
        const dummyOrder = await prisma.order.create({
          data: {
            orderNumber: `DUMMY-${i}`,
            userId: user.id,
            addressId: address.id,
            totalPrice: 0,
            grandTotal: 0,
            paymentDeadline: new Date(),
          }
        });
        await prisma.productionQueue.create({
          data: {
            orderId: dummyOrder.id,
            productionDate: prodDate,
            queuePosition: i
          }
        });
      }

      // Now create the 11th order through API
      await createTestCartItem(cart.id, variant.id, 1);
      const result = await request(web)
        .post("/api/orders")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          address_id: address.id,
        });

      expect(result.status).toBe(201);
      
      const queue = await prisma.productionQueue.findFirst({
        where: { orderId: result.body.data.id }
      });

      const expectedDate = new Date(prodDate);
      expectedDate.setDate(expectedDate.getDate() + 1);

      expect(new Date(queue.productionDate).getTime()).toBe(expectedDate.getTime());
      expect(queue.queuePosition).toBe(1);
    });

    it("should reject if cart is empty", async () => {
      await createTestUser();
      const user = await getTestUser();
      const address = await createTestAddress(user.id);

      const result = await request(web).post("/api/orders").set("Authorization", `Bearer ${user.token}`).send({
        address_id: address.id,
      });

      expect(result.status).toBe(400);
      expect(result.body.error).toBe("Keranjang belanja kosong.");
    });

    it("should reject if address does not belong to user", async () => {
      await createTestUser();
      const user1 = await getTestUser();

      await prisma.user.create({
        data: {
          name: "User 2",
          email: "user2@example.com",
          password: "password",
          token: "token2",
        },
      });
      const user2 = await prisma.user.findUnique({ where: { email: "user2@example.com" } });
      const address2 = await createTestAddress(user2.id);

      const flavor = await createTestFlavor();
      const size = await createTestSize();
      const product = await createTestProduct();
      const variant = await createTestVariant(product.id, flavor.id, size.id);
      const cart1 = await createTestCart(user1.id);
      await createTestCartItem(cart1.id, variant.id, 1);

      const result = await request(web).post("/api/orders").set("Authorization", `Bearer ${user1.token}`).send({
        address_id: address2.id,
      });

      expect(result.status).toBe(404);
      expect(result.body.error).toBe("Alamat tidak ditemukan.");
    });
  });

  describe("GET /api/orders", () => {
    it("should return orders with default pagination (page 1, size 10)", async () => {
      await createTestUser();
      const user = await getTestUser();
      const address = await createTestAddress(user.id);
      const flavor = await createTestFlavor();
      const size = await createTestSize();
      const product = await createTestProduct();
      const variant = await createTestVariant(product.id, flavor.id, size.id);

      // Create 15 orders
      for (let i = 0; i < 15; i++) {
        await createTestOrder(user.id, address.id, variant.id);
      }

      const response = await request(web)
        .get("/api/orders")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(10);
      expect(response.body.paging.page).toBe(1);
      expect(response.body.paging.total_item).toBe(15);
      expect(response.body.paging.total_page).toBe(2);
    });

    it("should return orders with custom pagination (page 2, size 5)", async () => {
      await createTestUser();
      const user = await getTestUser();
      const address = await createTestAddress(user.id);
      const flavor = await createTestFlavor();
      const size = await createTestSize();
      const product = await createTestProduct();
      const variant = await createTestVariant(product.id, flavor.id, size.id);

      // Create 15 orders
      for (let i = 0; i < 15; i++) {
        await createTestOrder(user.id, address.id, variant.id);
      }

      const response = await request(web)
        .get("/api/orders?page=2&size=5")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(5);
      expect(response.body.paging.page).toBe(2);
      expect(response.body.paging.total_item).toBe(15);
      expect(response.body.paging.total_page).toBe(3);
    });

    it("should return empty data if page exceeds total pages", async () => {
      await createTestUser();
      const user = await getTestUser();
      const address = await createTestAddress(user.id);
      const flavor = await createTestFlavor();
      const size = await createTestSize();
      const product = await createTestProduct();
      const variant = await createTestVariant(product.id, flavor.id, size.id);

      await createTestOrder(user.id, address.id, variant.id);

      const response = await request(web)
        .get("/api/orders?page=2&size=10")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(0);
      expect(response.body.paging.page).toBe(2);
      expect(response.body.paging.total_item).toBe(1);
      expect(response.body.paging.total_page).toBe(1);
    });
  });

  describe("GET /api/orders/:id", () => {
    it("should be able to get order detail", async () => {
      await createTestUser();
      const user = await getTestUser();
      const flavor = await createTestFlavor();
      const size = await createTestSize();
      const product = await createTestProduct();
      const variant = await createTestVariant(product.id, flavor.id, size.id);
      const address = await createTestAddress(user.id);

      const cart = await createTestCart(user.id);
      await createTestCartItem(cart.id, variant.id, 1);

      const createResult = await request(web).post("/api/orders").set("Authorization", `Bearer ${user.token}`).send({ address_id: address.id });

      const orderId = createResult.body.data.id;

      const result = await request(web).get(`/api/orders/${orderId}`).set("Authorization", `Bearer ${user.token}`);

      expect(result.status).toBe(200);
      expect(result.body.data.id).toBe(orderId);
      expect(result.body.data.items.length).toBe(1);
      expect(result.body.data.address).toBeDefined();
    });

    it("should return 404 if order not found", async () => {
      await createTestUser();
      const user = await getTestUser();

      const result = await request(web).get("/api/orders/9999").set("Authorization", `Bearer ${user.token}`);

      expect(result.status).toBe(404);
    });

    it("should return 400 if order ID is not a number", async () => {
      await createTestUser();
      const user = await getTestUser();

      const result = await request(web).get("/api/orders/abc").set("Authorization", `Bearer ${user.token}`);

      expect(result.status).toBe(400);
      expect(result.body.error).toBe("ID order tidak valid.");
    });
  });
});

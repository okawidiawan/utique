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
} from "./test-util.js";

describe("Cart API", () => {
  beforeEach(async () => {
    await removeTestCart();
    await removeAllVariants();
    await removeAllProducts();
    await removeAllFlavors();
    await removeAllSizes();
    await removeTestUser();
  });

  afterEach(async () => {
    await removeTestCart();
    await removeAllVariants();
    await removeAllProducts();
    await removeAllFlavors();
    await removeAllSizes();
    await removeTestUser();
  });

  describe("GET /api/cart", () => {
    it("should return empty array if user has no cart", async () => {
      await createTestUser();
      const user = await getTestUser();

      const result = await request(web)
        .get("/api/cart")
        .set("Authorization", `Bearer ${user.token}`);

      expect(result.status).toBe(200);
      expect(result.body.data).toEqual([]);
    });

    it("should return cart items if user has items in cart", async () => {
      // 1. Setup Master Data
      await createTestUser();
      const user = await getTestUser();
      const flavor = await createTestFlavor();
      const size = await createTestSize();
      const product = await createTestProduct();
      const variant = await createTestVariant(product.id, flavor.id, size.id);

      // 2. Setup Cart Data
      const cart = await createTestCart(user.id);
      await createTestCartItem(cart.id, variant.id, 2);

      // 3. Request
      const result = await request(web)
        .get("/api/cart")
        .set("Authorization", `Bearer ${user.token}`);

      // 4. Verification
      expect(result.status).toBe(200);
      expect(result.body.data.length).toBe(1);
      
      const item = result.body.data[0];
      expect(item.quantity).toBe(2);
      expect(item.price).toBe(variant.price);
      expect(item.product.name).toBe(product.name);
      expect(item.product.slug).toBe(product.slug);
      expect(item.variant.name).toBe(size.name);
      expect(item.flavor.name).toBe(flavor.name);
    });

    it("should reject request if unauthorized", async () => {
      const result = await request(web).get("/api/cart");

      expect(result.status).toBe(401);
      expect(result.body.error).toBeDefined();
    });
  });

  describe("POST /api/cart/items", () => {
    it("should be able to add new item to cart", async () => {
      await createTestUser();
      const user = await getTestUser();
      const flavor = await createTestFlavor();
      const size = await createTestSize();
      const product = await createTestProduct();
      const variant = await createTestVariant(product.id, flavor.id, size.id);

      const result = await request(web)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          variant_id: variant.id,
          quantity: 2,
        });

      expect(result.status).toBe(200);
      expect(result.body.data.message).toBe("Item berhasil ditambahkan ke keranjang");

      const cartResult = await request(web)
        .get("/api/cart")
        .set("Authorization", `Bearer ${user.token}`);

      expect(cartResult.body.data.length).toBe(1);
      expect(cartResult.body.data[0].quantity).toBe(2);
    });

    it("should be able to increment quantity if item already exists in cart", async () => {
      await createTestUser();
      const user = await getTestUser();
      const flavor = await createTestFlavor();
      const size = await createTestSize();
      const product = await createTestProduct();
      const variant = await createTestVariant(product.id, flavor.id, size.id);

      // Add first time
      await request(web)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          variant_id: variant.id,
          quantity: 2,
        });

      // Add second time (same variant)
      const result = await request(web)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          variant_id: variant.id,
          quantity: 3,
        });

      expect(result.status).toBe(200);
      expect(result.body.data.message).toBe("Item berhasil ditambahkan ke keranjang");

      const cartResult = await request(web)
        .get("/api/cart")
        .set("Authorization", `Bearer ${user.token}`);

      expect(cartResult.body.data.length).toBe(1);
      expect(cartResult.body.data[0].quantity).toBe(5);
    });

    it("should reject if request is invalid", async () => {
      await createTestUser();
      const user = await getTestUser();

      const result = await request(web)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          variant_id: -1,
          quantity: 0,
        });

      expect(result.status).toBe(400);
      expect(result.body.error).toBeDefined();
    });

    it("should reject if product variant is not found", async () => {
      await createTestUser();
      const user = await getTestUser();

      const result = await request(web)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          variant_id: 99999,
          quantity: 1,
        });

      expect(result.status).toBe(404);
      expect(result.body.error).toBe("Varian produk tidak ditemukan.");
    });

    it("should reject if product is not available", async () => {
      await createTestUser();
      const user = await getTestUser();
      const flavor = await createTestFlavor();
      const size = await createTestSize();
      
      // Create unavailable product
      const product = await prisma.product.create({
        data: {
          name: "Test Unavailable",
          slug: "test-unavailable",
          isAvailable: false
        }
      });
      const variant = await createTestVariant(product.id, flavor.id, size.id);

      const result = await request(web)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          variant_id: variant.id,
          quantity: 1,
        });

      expect(result.status).toBe(400);
      expect(result.body.error).toBe("Produk atau varian sedang tidak tersedia.");
    });

    it("should reject request if unauthorized", async () => {
      const result = await request(web)
        .post("/api/cart/items")
        .send({
          variant_id: 1,
          quantity: 1
        });

      expect(result.status).toBe(401);
      expect(result.body.error).toBeDefined();
    });
  });

  describe("PATCH /api/cart/items/:id", () => {
    it("should be able to update quantity of a cart item", async () => {
      await createTestUser();
      const user = await getTestUser();
      const flavor = await createTestFlavor();
      const size = await createTestSize();
      const product = await createTestProduct();
      const variant = await createTestVariant(product.id, flavor.id, size.id);
      const cart = await createTestCart(user.id);
      const cartItem = await createTestCartItem(cart.id, variant.id, 2);

      const result = await request(web)
        .patch(`/api/cart/items/${cartItem.id}`)
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          quantity: 5,
        });

      expect(result.status).toBe(200);
      expect(result.body.data.quantity).toBe(5);
    });

    it("should be able to update variant of a cart item", async () => {
      await createTestUser();
      const user = await getTestUser();
      const flavor = await createTestFlavor();
      const size1 = await createTestSize();
      const size2 = await prisma.size.create({ data: { name: "Large" } });
      const product = await createTestProduct();
      const variant1 = await createTestVariant(product.id, flavor.id, size1.id);
      const variant2 = await createTestVariant(product.id, flavor.id, size2.id);
      
      const cart = await createTestCart(user.id);
      const cartItem = await createTestCartItem(cart.id, variant1.id, 2);

      const result = await request(web)
        .patch(`/api/cart/items/${cartItem.id}`)
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          variant_id: variant2.id,
        });

      expect(result.status).toBe(200);
      expect(result.body.data.variant.id).toBe(variant2.id);
    });

    it("should merge items if updated variant already exists in cart", async () => {
      await createTestUser();
      const user = await getTestUser();
      const flavor = await createTestFlavor();
      const size1 = await createTestSize();
      const size2 = await prisma.size.create({ data: { name: "Extra Large" } });
      const product = await createTestProduct();
      
      const variant1 = await createTestVariant(product.id, flavor.id, size1.id);
      const variant2 = await createTestVariant(product.id, flavor.id, size2.id);

      const cart = await createTestCart(user.id);
      const item1 = await createTestCartItem(cart.id, variant1.id, 2);
      const item2 = await createTestCartItem(cart.id, variant2.id, 3);

      // Change item1 to variant2. It should merge with item2.
      const result = await request(web)
        .patch(`/api/cart/items/${item1.id}`)
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          variant_id: variant2.id,
        });

      expect(result.status).toBe(200);
      expect(result.body.data.id).toBe(item2.id);
      expect(result.body.data.quantity).toBe(5); // 2 + 3

      // item1 should be deleted
      const checkItem1 = await prisma.cartItem.findUnique({ where: { id: item1.id } });
      expect(checkItem1).toBeNull();
    });

    it("should reject if cart item does not belong to user", async () => {
      await createTestUser(); // user 1
      const user1 = await getTestUser();
      
      await prisma.user.create({
        data: {
          name: "User 2",
          email: "user2@example.com",
          password: "password",
          token: "token2"
        }
      });
      const user2 = await prisma.user.findUnique({ where: { email: "user2@example.com" } });

      const flavor = await createTestFlavor();
      const size = await createTestSize();
      const product = await createTestProduct();
      const variant = await createTestVariant(product.id, flavor.id, size.id);
      
      const cart2 = await createTestCart(user2.id);
      const cartItem2 = await createTestCartItem(cart2.id, variant.id, 2);

      // User 1 tries to update User 2's cart item
      const result = await request(web)
        .patch(`/api/cart/items/${cartItem2.id}`)
        .set("Authorization", `Bearer ${user1.token}`)
        .send({
          quantity: 10,
        });

      expect(result.status).toBe(404);
    });

    it("should reject if variant is not available", async () => {
      await createTestUser();
      const user = await getTestUser();
      const flavor = await createTestFlavor();
      const size = await createTestSize();
      const product = await createTestProduct();
      const variant1 = await createTestVariant(product.id, flavor.id, size.id);
      
      const unavailableProduct = await prisma.product.create({
        data: {
          name: "Unavailable",
          slug: "unavail",
          isAvailable: false
        }
      });
      const variant2 = await createTestVariant(unavailableProduct.id, flavor.id, size.id);

      const cart = await createTestCart(user.id);
      const cartItem = await createTestCartItem(cart.id, variant1.id, 2);

      const result = await request(web)
        .patch(`/api/cart/items/${cartItem.id}`)
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          variant_id: variant2.id,
        });

      expect(result.status).toBe(400);
    });

    it("should reject if cart item ID is not a number", async () => {
      await createTestUser();
      const user = await getTestUser();

      const result = await request(web)
        .patch("/api/cart/items/abc")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          quantity: 10,
        });

      expect(result.status).toBe(400);
      expect(result.body.error).toBe("ID item keranjang tidak valid.");
    });
  });

  describe("DELETE /api/cart/items/:id", () => {
    it("should be able to remove item from cart", async () => {
      await createTestUser();
      const user = await getTestUser();
      const flavor = await createTestFlavor();
      const size = await createTestSize();
      const product = await createTestProduct();
      const variant = await createTestVariant(product.id, flavor.id, size.id);
      const cart = await createTestCart(user.id);
      const cartItem = await createTestCartItem(cart.id, variant.id, 2);

      const result = await request(web)
        .delete(`/api/cart/items/${cartItem.id}`)
        .set("Authorization", `Bearer ${user.token}`);

      expect(result.status).toBe(200);
      expect(result.body.data.message).toBe("Item berhasil dihapus dari keranjang");

      const checkItem = await prisma.cartItem.findUnique({
        where: { id: cartItem.id },
      });
      expect(checkItem).toBeNull();
    });

    it("should reject if cart item does not belong to user", async () => {
      await createTestUser(); // user 1
      const user1 = await getTestUser();

      await prisma.user.create({
        data: {
          name: "User 2",
          email: "user2@example.com",
          password: "password",
          token: "token2",
        },
      });
      const user2 = await prisma.user.findUnique({
        where: { email: "user2@example.com" },
      });

      const flavor = await createTestFlavor();
      const size = await createTestSize();
      const product = await createTestProduct();
      const variant = await createTestVariant(product.id, flavor.id, size.id);

      const cart2 = await createTestCart(user2.id);
      const cartItem2 = await createTestCartItem(cart2.id, variant.id, 2);

      // User 1 tries to delete User 2's cart item
      const result = await request(web)
        .delete(`/api/cart/items/${cartItem2.id}`)
        .set("Authorization", `Bearer ${user1.token}`);

      expect(result.status).toBe(404);
      expect(result.body.error).toBe("Item tidak ditemukan di dalam keranjang.");
    });

    it("should reject request if unauthorized", async () => {
      const result = await request(web).delete("/api/cart/items/1");

      expect(result.status).toBe(401);
    });

    it("should reject if cart item ID is not a number", async () => {
      await createTestUser();
      const user = await getTestUser();

      const result = await request(web)
        .delete("/api/cart/items/abc")
        .set("Authorization", `Bearer ${user.token}`);

      expect(result.status).toBe(400);
      expect(result.body.error).toBe("ID item keranjang tidak valid.");
    });
  });
});

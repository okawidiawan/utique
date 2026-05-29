import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import request from "supertest";
import { web } from "../src/application/web.js";
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
});

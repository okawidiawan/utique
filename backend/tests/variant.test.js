import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import request from "supertest";
import { web } from "../src/application/web.js";
import {
  removeTestUser,
  createTestUser,
  createTestAdmin,
  removeAllFlavors,
  createTestFlavor,
  removeAllSizes,
  createTestSize,
  removeAllProducts,
  createTestProduct,
  removeAllVariants,
  createTestVariant,
} from "./test-util.js";

describe("Variant API", () => {
  let product;
  let flavor;
  let size;

  beforeEach(async () => {
    await createTestAdmin();
    await createTestUser();
    product = await createTestProduct();
    flavor = await createTestFlavor();
    size = await createTestSize();
  });

  afterEach(async () => {
    await removeAllVariants();
    await removeAllProducts();
    await removeAllFlavors();
    await removeAllSizes();
    await removeTestUser();
  });

  describe("POST /api/admin/products/:id/variants", () => {
    it("should can create variant as admin", async () => {
      const result = await request(web)
        .post(`/api/admin/products/${product.id}/variants`)
        .set("Authorization", "Bearer admin-token")
        .send({
          flavorId: flavor.id,
          sizeId: size.id,
          price: 35000,
          isAvailable: true,
        });

      expect(result.status).toBe(201);
      expect(result.body.data.id).toBeDefined();
      expect(result.body.data.productId).toBe(product.id);
      expect(result.body.data.flavorId).toBe(flavor.id);
      expect(result.body.data.sizeId).toBe(size.id);
      expect(result.body.data.price).toBe(35000);
    });

    it("should reject if product not found", async () => {
      const result = await request(web)
        .post("/api/admin/products/999/variants")
        .set("Authorization", "Bearer admin-token")
        .send({
          flavorId: flavor.id,
          sizeId: size.id,
          price: 35000,
        });

      expect(result.status).toBe(404);
      expect(result.body.error).toBe("Produk tidak ditemukan.");
    });

    it("should reject if flavor not found", async () => {
      const result = await request(web)
        .post(`/api/admin/products/${product.id}/variants`)
        .set("Authorization", "Bearer admin-token")
        .send({
          flavorId: 999,
          sizeId: size.id,
          price: 35000,
        });

      expect(result.status).toBe(400);
      expect(result.body.error).toBe("Rasa tidak ditemukan.");
    });

    it("should reject if size not found", async () => {
      const result = await request(web)
        .post(`/api/admin/products/${product.id}/variants`)
        .set("Authorization", "Bearer admin-token")
        .send({
          flavorId: flavor.id,
          sizeId: 999,
          price: 35000,
        });

      expect(result.status).toBe(400);
      expect(result.body.error).toBe("Ukuran tidak ditemukan.");
    });

    it("should reject if variant combination is duplicate", async () => {
      await createTestVariant(product.id, flavor.id, size.id);

      const result = await request(web)
        .post(`/api/admin/products/${product.id}/variants`)
        .set("Authorization", "Bearer admin-token")
        .send({
          flavorId: flavor.id,
          sizeId: size.id,
          price: 45000,
        });

      expect(result.status).toBe(400);
      expect(result.body.error).toBe("Varian produk ini sudah terdaftar.");
    });
  });

  describe("PATCH /api/admin/variants/:id", () => {
    it("should can update variant price and availability as admin", async () => {
      const variant = await createTestVariant(product.id, flavor.id, size.id);

      const result = await request(web)
        .patch(`/api/admin/variants/${variant.id}`)
        .set("Authorization", "Bearer admin-token")
        .send({
          price: 40000,
          isAvailable: false,
        });

      expect(result.status).toBe(200);
      expect(result.body.data.price).toBe(40000);
      expect(result.body.data.isAvailable).toBe(false);
    });

    it("should reject update if variant not found", async () => {
      const result = await request(web)
        .patch("/api/admin/variants/999")
        .set("Authorization", "Bearer admin-token")
        .send({
          price: 40000,
        });

      expect(result.status).toBe(404);
      expect(result.body.error).toBe("Varian tidak ditemukan.");
    });

    it("should reject update if variant ID is invalid", async () => {
      const result = await request(web)
        .patch("/api/admin/variants/invalid-id")
        .set("Authorization", "Bearer admin-token")
        .send({
          price: 40000,
        });

      expect(result.status).toBe(400);
      expect(result.body.error).toContain("ID varian tidak valid.");
    });
  });

  describe("DELETE /api/admin/variants/:id", () => {
    it("should can delete variant as admin", async () => {
      const variant = await createTestVariant(product.id, flavor.id, size.id);

      const result = await request(web)
        .delete(`/api/admin/variants/${variant.id}`)
        .set("Authorization", "Bearer admin-token");

      expect(result.status).toBe(200);
      expect(result.body.data).toBe("OK");
    });

    it("should reject delete if variant not found", async () => {
      const result = await request(web)
        .delete("/api/admin/variants/999")
        .set("Authorization", "Bearer admin-token");

      expect(result.status).toBe(404);
      expect(result.body.error).toBe("Varian tidak ditemukan.");
    });
  });
});

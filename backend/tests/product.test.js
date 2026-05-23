import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import request from "supertest";
import { web } from "../src/application/web.js";
import {
  removeTestUser,
  createTestUser,
  createTestAdmin,
  removeAllProducts,
  createTestProduct,
} from "./test-util.js";

describe("Product API", () => {
  beforeEach(async () => {
    await createTestAdmin();
    await createTestUser();
  });

  afterEach(async () => {
    await removeAllProducts();
    await removeTestUser();
  });

  describe("POST /api/admin/products", () => {
    it("should can create product as admin", async () => {
      const result = await request(web)
        .post("/api/admin/products")
        .set("Authorization", "Bearer admin-token")
        .send({
          name: "Cookies Classic",
          description: "Classic chocolate chip cookies",
          productionTimeDays: 2,
          isAvailable: true,
          imageUrl: "http://example.com/classic.jpg",
        });

      expect(result.status).toBe(201);
      expect(result.body.data.id).toBeDefined();
      expect(result.body.data.name).toBe("Cookies Classic");
      expect(result.body.data.slug).toBe("cookies-classic");
    });

    it("should reject create product if name is empty", async () => {
      const result = await request(web)
        .post("/api/admin/products")
        .set("Authorization", "Bearer admin-token")
        .send({
          name: "",
          description: "No name",
        });

      expect(result.status).toBe(400);
      expect(result.body.error).toContain("Nama produk wajib diisi.");
    });

    it("should reject create product if slug is duplicate", async () => {
      await createTestProduct();

      const result = await request(web)
        .post("/api/admin/products")
        .set("Authorization", "Bearer admin-token")
        .send({
          name: "Test Product Cookies", // Ini akan generate slug 'test-product-cookies'
        });

      expect(result.status).toBe(400);
      expect(result.body.error).toBe("Nama produk sudah digunakan (slug duplikat).");
    });
  });

  describe("PATCH /api/admin/products/:id", () => {
    it("should can update product as admin", async () => {
      const product = await createTestProduct();

      const result = await request(web)
        .patch(`/api/admin/products/${product.id}`)
        .set("Authorization", "Bearer admin-token")
        .send({
          name: "Updated Product Cookies",
          isAvailable: false,
        });

      expect(result.status).toBe(200);
      expect(result.body.data.name).toBe("Updated Product Cookies");
      expect(result.body.data.slug).toBe("updated-product-cookies");
      expect(result.body.data.isAvailable).toBe(false);
    });

    it("should reject update product if product not found", async () => {
      const result = await request(web)
        .patch("/api/admin/products/999")
        .set("Authorization", "Bearer admin-token")
        .send({
          name: "Non-existent Product",
        });

      expect(result.status).toBe(404);
      expect(result.body.error).toBe("Produk tidak ditemukan.");
    });

    it("should reject update product if ID is invalid", async () => {
      const result = await request(web)
        .patch("/api/admin/products/invalid-id")
        .set("Authorization", "Bearer admin-token")
        .send({
          name: "Invalid ID",
        });

      expect(result.status).toBe(400);
      expect(result.body.error).toContain("ID produk tidak valid.");
    });
  });

  describe("DELETE /api/admin/products/:id", () => {
    it("should can delete product as admin", async () => {
      const product = await createTestProduct();

      const result = await request(web)
        .delete(`/api/admin/products/${product.id}`)
        .set("Authorization", "Bearer admin-token");

      expect(result.status).toBe(200);
      expect(result.body.data).toBe("OK");
    });

    it("should reject delete product if product not found", async () => {
      const result = await request(web)
        .delete("/api/admin/products/999")
        .set("Authorization", "Bearer admin-token");

      expect(result.status).toBe(404);
      expect(result.body.error).toBe("Produk tidak ditemukan.");
    });
  });
});

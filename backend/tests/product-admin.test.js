import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import request from "supertest";
import { web } from "../src/application/web.js";
import { prisma } from "../src/application/database.js";
import {
  masterCleanup,
  createTestUser,
  createTestAdmin,
  createTestFlavor,
  createTestSize,
  createTestProduct,
  createTestVariant,
  createTestCart,
  createTestCartItem,
  createTestAddress,
  createTestOrder,
} from "./test-util.js";

// ==========================================
// Product Admin API Tests — Unit test untuk CRUD produk & varian admin
// ==========================================
describe("Product Admin API", () => {
  beforeEach(async () => {
    await masterCleanup();
    await createTestAdmin();
    await createTestUser();
  });

  afterEach(async () => {
    await masterCleanup();
  });

  describe("Product CRUD", () => {
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
      it("should can delete product as admin (soft delete)", async () => {
        const product = await createTestProduct();

        const result = await request(web)
          .delete(`/api/admin/products/${product.id}`)
          .set("Authorization", "Bearer admin-token");

        expect(result.status).toBe(200);
        expect(result.body.data).toBe("OK");

        const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
        expect(updatedProduct.isAvailable).toBe(false);
      });

      it("should return 404 if product not found during delete", async () => {
        const result = await request(web)
          .delete("/api/admin/products/999")
          .set("Authorization", "Bearer admin-token");

        expect(result.status).toBe(404);
        expect(result.body.error).toBe("Produk tidak ditemukan.");
      });

      it("should allow soft delete product even if it is in cart", async () => {
        const existingUser = await prisma.user.findUnique({ where: { email: "test@example.com" } });
        const product = await createTestProduct();
        const flavor = await createTestFlavor();
        const size = await createTestSize();
        const variant = await createTestVariant(product.id, flavor.id, size.id);
        
        const cart = await createTestCart(existingUser.id);
        await createTestCartItem(cart.id, variant.id, 1);

        const result = await request(web)
          .delete(`/api/admin/products/${product.id}`)
          .set("Authorization", "Bearer admin-token");

        expect(result.status).toBe(200);
        expect(result.body.data).toBe("OK");

        const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
        expect(updatedProduct.isAvailable).toBe(false);
      });

      it("should allow soft delete product even if it is in order", async () => {
        const existingUser = await prisma.user.findUnique({ where: { email: "test@example.com" } });
        const product = await createTestProduct();
        const flavor = await createTestFlavor();
        const size = await createTestSize();
        const variant = await createTestVariant(product.id, flavor.id, size.id);
        const address = await createTestAddress(existingUser.id);
        
        await createTestOrder(existingUser.id, address.id, variant.id);

        const result = await request(web)
          .delete(`/api/admin/products/${product.id}`)
          .set("Authorization", "Bearer admin-token");

        expect(result.status).toBe(200);
        expect(result.body.data).toBe("OK");

        const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
        expect(updatedProduct.isAvailable).toBe(false);
      });
    });
  });

  describe("Variant Management", () => {
    let product;
    let flavor;
    let size;

    beforeEach(async () => {
      product = await createTestProduct();
      flavor = await createTestFlavor();
      size = await createTestSize();
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
      it("should can delete variant as admin (soft delete)", async () => {
        const variant = await createTestVariant(product.id, flavor.id, size.id);

        const result = await request(web)
          .delete(`/api/admin/variants/${variant.id}`)
          .set("Authorization", "Bearer admin-token");

        expect(result.status).toBe(200);
        expect(result.body.data).toBe("OK");

        const updatedVariant = await prisma.productVariant.findUnique({ where: { id: variant.id } });
        expect(updatedVariant.isAvailable).toBe(false);
      });

      it("should return 404 if variant not found during delete", async () => {
        const result = await request(web)
          .delete("/api/admin/variants/999")
          .set("Authorization", "Bearer admin-token");

        expect(result.status).toBe(404);
        expect(result.body.error).toBe("Varian tidak ditemukan.");
      });

      it("should allow soft delete variant even if it is in cart", async () => {
        const existingUser = await prisma.user.findUnique({ where: { email: "test@example.com" } });
        const variant = await createTestVariant(product.id, flavor.id, size.id);
        
        const cart = await createTestCart(existingUser.id);
        await createTestCartItem(cart.id, variant.id, 1);

        const result = await request(web)
          .delete(`/api/admin/variants/${variant.id}`)
          .set("Authorization", "Bearer admin-token");

        expect(result.status).toBe(200);
        expect(result.body.data).toBe("OK");

        const updatedVariant = await prisma.productVariant.findUnique({ where: { id: variant.id } });
        expect(updatedVariant.isAvailable).toBe(false);
      });

      it("should allow soft delete variant even if it is in order", async () => {
        const existingUser = await prisma.user.findUnique({ where: { email: "test@example.com" } });
        const variant = await createTestVariant(product.id, flavor.id, size.id);
        const address = await createTestAddress(existingUser.id);
        
        await createTestOrder(existingUser.id, address.id, variant.id);

        const result = await request(web)
          .delete(`/api/admin/variants/${variant.id}`)
          .set("Authorization", "Bearer admin-token");

        expect(result.status).toBe(200);
        expect(result.body.data).toBe("OK");

        const updatedVariant = await prisma.productVariant.findUnique({ where: { id: variant.id } });
        expect(updatedVariant.isAvailable).toBe(false);
      });
    });
  });
});

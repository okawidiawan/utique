import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import request from "supertest";
import { web } from "../src/application/web.js";
import { prisma } from "../src/application/database.js";
import {
  removeAllProducts,
  removeAllFlavors,
  removeAllSizes,
  removeAllVariants,
} from "./test-util.js";

// ==========================================
// Public Product API Tests — Unit test untuk katalog dan detail produk publik
// ==========================================
describe("Public Product API", () => {
  beforeEach(async () => {
    // Bersihkan data sebelum test
    await removeAllVariants();
    await removeAllProducts();
    await removeAllFlavors();
    await removeAllSizes();
  });

  afterEach(async () => {
    // Bersihkan data setelah test
    await removeAllVariants();
    await removeAllProducts();
    await removeAllFlavors();
    await removeAllSizes();
  });

  describe("GET /api/products", () => {
    it("should can get list of products with default pagination", async () => {
      // Create 12 products
      await prisma.product.createMany({
        data: Array.from({ length: 12 }, (_, i) => ({
          name: `Cookies ${i + 1}`,
          slug: `cookies-${i + 1}`,
          description: `Description for cookies ${i + 1}`,
          isAvailable: true,
          productionTimeDays: 2,
        })),
      });

      const response = await request(web)
        .get("/api/products");

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(10); // Default size 10
      expect(response.body.paging.page).toBe(1);
      expect(response.body.paging.total_item).toBe(12);
      expect(response.body.paging.total_page).toBe(2);
    });

    it("should only return available products", async () => {
      await prisma.product.create({
        data: {
          name: "Available Cookies",
          slug: "available-cookies",
          isAvailable: true,
        },
      });

      await prisma.product.create({
        data: {
          name: "Unavailable Cookies",
          slug: "unavailable-cookies",
          isAvailable: false,
        },
      });

      const response = await request(web).get("/api/products");

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toBe("Available Cookies");
      expect(response.body.paging.total_item).toBe(1);
    });

    it("should can search products by name", async () => {
      await prisma.product.createMany({
        data: [
          { name: "Choco Chip", slug: "choco-chip", isAvailable: true },
          { name: "Double Chocolate", slug: "double-chocolate", isAvailable: true },
          { name: "Strawberry Tart", slug: "strawberry-tart", isAvailable: true },
        ],
      });

      const response = await request(web)
        .get("/api/products")
        .query({ name: "choco" });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
      expect(response.body.paging.total_item).toBe(2);
    });

    it("should support custom pagination parameters", async () => {
      await prisma.product.createMany({
        data: Array.from({ length: 5 }, (_, i) => ({
          name: `Product ${i + 1}`,
          slug: `product-${i + 1}`,
          isAvailable: true,
        })),
      });

      const response = await request(web)
        .get("/api/products")
        .query({ page: 2, size: 2 });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
      expect(response.body.paging.page).toBe(2);
      expect(response.body.paging.total_item).toBe(5);
      expect(response.body.paging.total_page).toBe(3);
    });
  });

  describe("GET /api/products/:slug", () => {
    it("should return detailed product with variants, flavor, and size", async () => {
      const product = await prisma.product.create({
        data: {
          name: "Signature Cookies",
          slug: "signature-cookies",
          isAvailable: true,
        },
      });

      const flavor = await prisma.flavor.create({
        data: { name: "Red Velvet" },
      });

      const size = await prisma.size.create({
        data: { name: "Large", description: "30pcs" },
      });

      await prisma.productVariant.create({
        data: {
          productId: product.id,
          flavorId: flavor.id,
          sizeId: size.id,
          price: 35000,
          isAvailable: true,
        },
      });

      const response = await request(web)
        .get(`/api/products/${product.slug}`);

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe("Signature Cookies");
      expect(response.body.data.variants.length).toBe(1);
      expect(response.body.data.variants[0].price).toBe(35000);
      expect(response.body.data.variants[0].flavor.name).toBe("Red Velvet");
      expect(response.body.data.variants[0].size.name).toBe("Large");
    });

    it("should return 404 if product not found by slug", async () => {
      const response = await request(web)
        .get("/api/products/non-existent-cookies");

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Produk tidak ditemukan.");
    });

    it("should return 404 if product is not available for public", async () => {
      const product = await prisma.product.create({
        data: {
          name: "Hidden Cookies",
          slug: "hidden-cookies",
          isAvailable: false,
        },
      });

      const response = await request(web)
        .get(`/api/products/${product.slug}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Produk tidak ditemukan.");
    });
  });
});

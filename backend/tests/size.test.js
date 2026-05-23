import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import request from "supertest";
import { web } from "../src/application/web.js";
import {
  removeTestUser,
  createTestUser,
  createTestAdmin,
  removeAllSizes,
  createTestSize,
} from "./test-util.js";

describe("Size API", () => {
  beforeEach(async () => {
    await createTestAdmin();
    await createTestUser();
  });

  afterEach(async () => {
    await removeAllSizes();
    await removeTestUser();
  });

  describe("POST /api/admin/sizes", () => {
    it("should can create size as admin", async () => {
      const result = await request(web)
        .post("/api/admin/sizes")
        .set("Authorization", "Bearer admin-token")
        .send({
          name: "Medium",
          description: "20pcs",
        });

      expect(result.status).toBe(201);
      expect(result.body.data.id).toBeDefined();
      expect(result.body.data.name).toBe("Medium");
      expect(result.body.data.description).toBe("20pcs");
    });

    it("should reject create size if not admin", async () => {
      const result = await request(web)
        .post("/api/admin/sizes")
        .set("Authorization", "Bearer test-token")
        .send({
          name: "Medium",
          description: "20pcs",
        });

      expect(result.status).toBe(403);
      expect(result.body.error).toBe("Akses ditolak. Anda tidak memiliki izin admin.");
    });

    it("should reject create size if size already exists", async () => {
      await createTestSize();

      const result = await request(web)
        .post("/api/admin/sizes")
        .set("Authorization", "Bearer admin-token")
        .send({
          name: "Test Size Small",
          description: "10pcs",
        });

      expect(result.status).toBe(400);
      expect(result.body.error).toBe("Ukuran sudah ada.");
    });

    it("should reject create size if name is empty", async () => {
      const result = await request(web)
        .post("/api/admin/sizes")
        .set("Authorization", "Bearer admin-token")
        .send({
          name: "",
          description: "10pcs",
        });

      expect(result.status).toBe(400);
      expect(result.body.error).toContain("Nama ukuran wajib diisi.");
    });
  });

  describe("GET /api/admin/sizes", () => {
    it("should can get list of sizes as admin", async () => {
      await createTestSize();

      const result = await request(web)
        .get("/api/admin/sizes")
        .set("Authorization", "Bearer admin-token");

      expect(result.status).toBe(200);
      expect(result.body.data.length).toBe(1);
      expect(result.body.data[0].name).toBe("Test Size Small");
    });

    it("should reject get sizes if not admin", async () => {
      const result = await request(web)
        .get("/api/admin/sizes")
        .set("Authorization", "Bearer test-token");

      expect(result.status).toBe(403);
    });
  });
});

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import request from "supertest";
import { web } from "../src/application/web.js";
import { removeTestUser, createTestUser, getTestUser } from "./test-util.js";

describe("User API", () => {
  beforeEach(async () => {
    await removeTestUser();
  });

  afterEach(async () => {
    await removeTestUser();
  });

  describe("POST /api/users (Register)", () => {
    it("should can register new user", async () => {
      const result = await request(web).post("/api/users").send({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      });

      expect(result.status).toBe(201);
      expect(result.body.data.name).toBe("Test User");
      expect(result.body.data.email).toBe("test@example.com");
      expect(result.body.data.password).toBeUndefined();
    });

    it("should reject register if email already exists", async () => {
      await createTestUser();

      const result = await request(web).post("/api/users").send({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      });

      expect(result.status).toBe(400);
      expect(result.body.error).toBe("Email sudah terdaftar.");
    });

    it("should reject register if request is invalid", async () => {
      const result = await request(web).post("/api/users").send({
        name: "",
        email: "invalid-email",
        password: "123",
      });

      expect(result.status).toBe(400);
      expect(result.body.error).toContain("Nama wajib diisi.");
      expect(result.body.error).toContain("Format email tidak valid.");
      expect(result.body.error).toContain("Password minimal 6 karakter.");
    });

    it("should can register new user without phone", async () => {
      const result = await request(web).post("/api/users").send({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        // phone tidak diisi
      });

      expect(result.status).toBe(201);
      expect(result.body.data.name).toBe("Test User");
      expect(result.body.data.phone).toBeNull();
    });
  });

  describe("POST /api/users/login", () => {
    it("should can login", async () => {
      await createTestUser();

      const result = await request(web).post("/api/users/login").send({
        email: "test@example.com",
        password: "rahasia123",
      });

      expect(result.status).toBe(200);
      expect(result.body.data.token).toBeDefined();
      expect(result.body.data.email).toBe("test@example.com");

      const user = await getTestUser();
      expect(user.token).toBe(result.body.data.token);
    });

    it("should reject login if credentials invalid", async () => {
      await createTestUser();

      const result = await request(web).post("/api/users/login").send({
        email: "test@example.com",
        password: "wrong-password",
      });

      expect(result.status).toBe(401);
      expect(result.body.error).toBe("Email atau password salah.");
    });

    it("should reject login if email not found", async () => {
      const result = await request(web).post("/api/users/login").send({
        email: "notfound@example.com",
        password: "password123",
      });

      expect(result.status).toBe(401);
      expect(result.body.error).toBe("Email atau password salah.");
    });

    it("should reject login if email is empty", async () => {
      const result = await request(web).post("/api/users/login").send({
        email: "",
        password: "password123",
      });

      expect(result.status).toBe(400);
      expect(result.body.error).toContain("Email wajib diisi.");
    });

    it("should reject login if password is empty", async () => {
      const result = await request(web).post("/api/users/login").send({
        email: "test@example.com",
        password: "",
      });

      expect(result.status).toBe(400);
      expect(result.body.error).toContain("Password wajib diisi.");
    });
  });

  describe("GET /api/users/current", () => {
    it("should can get current user", async () => {
      await createTestUser();

      const result = await request(web)
        .get("/api/users/current")
        .set("Authorization", "Bearer test-token");

      expect(result.status).toBe(200);
      expect(result.body.data.email).toBe("test@example.com");
      expect(result.body.data.name).toBe("Test User");
    });

    it("should reject if token is missing", async () => {
      const result = await request(web).get("/api/users/current");

      expect(result.status).toBe(401);
      expect(result.body.error).toBe("Akses ditolak. Token tidak ditemukan.");
    });

    it("should reject if token is invalid", async () => {
      await createTestUser();

      const result = await request(web)
        .get("/api/users/current")
        .set("Authorization", "Bearer wrong-token");

      expect(result.status).toBe(401);
      expect(result.body.error).toBe("Akses ditolak. Token tidak valid atau sudah expired.");
    });
  });

  describe("PATCH /api/users/current", () => {
    it("should can update name", async () => {
      await createTestUser();

      const result = await request(web)
        .patch("/api/users/current")
        .set("Authorization", "Bearer test-token")
        .send({
          name: "Updated Name",
        });

      expect(result.status).toBe(200);
      expect(result.body.data.name).toBe("Updated Name");

      const user = await getTestUser();
      expect(user.name).toBe("Updated Name");
    });

    it("should can update password", async () => {
      await createTestUser();

      const result = await request(web)
        .patch("/api/users/current")
        .set("Authorization", "Bearer test-token")
        .send({
          password: "new-password123",
        });

      expect(result.status).toBe(200);

      const loginResult = await request(web).post("/api/users/login").send({
        email: "test@example.com",
        password: "new-password123",
      });
      expect(loginResult.status).toBe(200);
    });

    it("should reject update if request is invalid", async () => {
      await createTestUser();

      const result = await request(web)
        .patch("/api/users/current")
        .set("Authorization", "Bearer test-token")
        .send({
          password: "123",
        });

      expect(result.status).toBe(400);
      expect(result.body.error).toBe("Password minimal 6 karakter.");
    });

    it("should reject if email already used by another user", async () => {
      await createTestUser();
      await request(web).post("/api/users").send({
        name: "Other User",
        email: "other@example.com",
        password: "password123",
      });

      const result = await request(web)
        .patch("/api/users/current")
        .set("Authorization", "Bearer test-token")
        .send({
          email: "other@example.com",
        });

      expect(result.status).toBe(400);
      expect(result.body.error).toBe("Email sudah digunakan.");
    });

    it("should can update email", async () => {
      await createTestUser();

      const result = await request(web)
        .patch("/api/users/current")
        .set("Authorization", "Bearer test-token")
        .send({
          email: "newemail@example.com",
        });

      expect(result.status).toBe(200);
      expect(result.body.data.email).toBe("newemail@example.com");
    });

    it("should can update phone", async () => {
      await createTestUser();

      const result = await request(web)
        .patch("/api/users/current")
        .set("Authorization", "Bearer test-token")
        .send({
          phone: "089876543210",
        });

      expect(result.status).toBe(200);
      expect(result.body.data.phone).toBe("089876543210");
    });

    it("should can update multiple fields", async () => {
      await createTestUser();

      const result = await request(web)
        .patch("/api/users/current")
        .set("Authorization", "Bearer test-token")
        .send({
          name: "New Name",
          phone: "081111111111",
        });

      expect(result.status).toBe(200);
      expect(result.body.data.name).toBe("New Name");
      expect(result.body.data.phone).toBe("081111111111");
    });
  });

  describe("DELETE /api/users/logout", () => {
    it("should can logout", async () => {
      await createTestUser();

      const result = await request(web)
        .delete("/api/users/logout")
        .set("Authorization", "Bearer test-token");

      expect(result.status).toBe(200);
      expect(result.body.data).toBe("Berhasil logout.");

      const user = await getTestUser();
      expect(user.token).toBeNull();
    });

    it("should reject logout if token is invalid", async () => {
      const result = await request(web)
        .delete("/api/users/logout")
        .set("Authorization", "Bearer invalid");

      expect(result.status).toBe(401);
      expect(result.body.error).toBe("Akses ditolak. Token tidak valid atau sudah expired.");
    });

    it("should not be able to use token after logout", async () => {
      await createTestUser();

      // Logout dulu
      await request(web)
        .delete("/api/users/logout")
        .set("Authorization", "Bearer test-token");

      // Coba akses endpoint yang butuh autentikasi
      const result = await request(web)
        .get("/api/users/current")
        .set("Authorization", "Bearer test-token");

      expect(result.status).toBe(401);
      expect(result.body.error).toBe("Akses ditolak. Token tidak valid atau sudah expired.");
    });
  });
});

# Fix: Perbaikan Test Utility & Penambahan Skenario Test User API

## Deskripsi

Hasil review implementasi API Auth & User menemukan 2 hal yang perlu diperbaiki:
1. **Data leak di test utility** — User `other@example.com` yang dibuat di skenario "email already used" tidak dibersihkan setelah test selesai.
2. **Test coverage belum lengkap** — Issue awal (#3) meminta 22 skenario test, baru 15 yang diimplementasi.

---

## Perbaikan 1: Cleanup `test-util.js`

### Masalah

File `tests/test-util.js` hanya menghapus user dengan email `test@example.com`. Namun, skenario test "should reject if email already used by another user" di `PATCH /api/users/current` membuat user tambahan `other@example.com` yang **tidak ikut dihapus** di `afterEach`.

### Solusi

Ubah fungsi `removeTestUser` di `tests/test-util.js` agar juga menghapus user `other@example.com`:

```javascript
export const removeTestUser = async () => {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: ["test@example.com", "other@example.com"],
      },
    },
  });
};
```

---

## Perbaikan 2: Tambah Skenario Test yang Belum Dicover

Tambahkan 7 skenario test berikut ke `tests/user.test.js`:

### Register — `POST /api/users`

#### 1. Berhasil registrasi tanpa phone (opsional)

```javascript
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
```

### Login — `POST /api/users/login`

#### 2. Gagal jika email kosong

```javascript
it("should reject login if email is empty", async () => {
  const result = await request(web).post("/api/users/login").send({
    email: "",
    password: "password123",
  });

  expect(result.status).toBe(400);
  expect(result.body.error).toContain("Email wajib diisi.");
});
```

#### 3. Gagal jika password kosong

```javascript
it("should reject login if password is empty", async () => {
  const result = await request(web).post("/api/users/login").send({
    email: "test@example.com",
    password: "",
  });

  expect(result.status).toBe(400);
  expect(result.body.error).toContain("Password wajib diisi.");
});
```

### Update User — `PATCH /api/users/current`

#### 4. Berhasil update email

```javascript
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
```

#### 5. Berhasil update phone

```javascript
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
```

#### 6. Berhasil update multiple field sekaligus

```javascript
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
```

### Logout — `DELETE /api/users/logout`

#### 7. Token yang sudah di-logout tidak bisa digunakan lagi

```javascript
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
```

---

## File yang Dimodifikasi

| File | Perubahan |
|---|---|
| `tests/test-util.js` | Update `removeTestUser` untuk cleanup `other@example.com` |
| `tests/user.test.js` | Tambah 7 skenario test baru |

## Verifikasi

Jalankan `bun test` dan pastikan semua **22 skenario** test berhasil (15 existing + 7 baru).

---

## Catatan

- Jangan mengubah file selain yang disebutkan di atas.
- Pastikan test yang sudah ada tetap lolos setelah perubahan.

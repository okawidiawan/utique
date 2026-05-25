# Implementasi Tahap 3: Produk Public (Customer Bisa Browse)

## 📌 Deskripsi Tugas
Melanjutkan pengembangan API dari tahap 2, pada tahap 3 ini kita akan mengimplementasikan API publik yang dapat diakses oleh customer (tanpa perlu token/login) untuk melihat katalog produk dan detail produk beserta varian dan review-nya.

Task ini mencakup pembuatan endpoint:
1. `GET /api/products` — Mengambil list produk cookies (paginasi & filter).
2. `GET /api/products/:slug` — Mengambil detail produk + varian + review.

Dokumen ini disusun agar bisa dieksekusi langsung oleh Junior Programmer / AI Coder. Tolong baca dengan teliti arsitektur yang digunakan (`Router → Controller → Service → Prisma`) dan selalu ingat untuk memberikan komentar ber-Bahasa Indonesia di kode serta membuat unit test yang solid.

---

## 🛠️ Detail Implementasi (Langkah demi Langkah)

### 1. Buat Skema Validasi (Zod)
**File:** `backend/src/validation/product-validation.js`

Tambahkan skema validasi untuk request pencarian (search) produk publik:
- **`searchProductValidation`**: 
  - `page`: opsional, konversi string ke angka (coercion), default 1, min 1.
  - `size`: opsional, konversi string ke angka (coercion), default 10, min 1.
  - `name`: opsional, tipe string (untuk filter berdasarkan nama produk).
- **`getProductValidation`**:
  - `slug`: string tidak boleh kosong, max 100 karakter.

> **Catatan:** Semua error message validasi Zod wajib berbahasa Indonesia (misal: `"Nama produk harus berupa teks"`).

### 2. Implementasi Logika Bisnis (Service)
**File:** `backend/src/services/product-service.js`

Tambahkan 2 fungsi baru (atau perbarui jika sudah ada):

- **`search(request)`**:
  - Lakukan validasi `request` menggunakan `searchProductValidation`.
  - Susun objek `where` (kondisi pencarian) untuk `prisma.product.findMany`.
    - Jika `name` ada, gunakan `{ name: { contains: request.name, mode: 'insensitive' } }`.
  - Lakukan paginasi dengan menghitung `skip = (page - 1) * size` dan menggunakan `take = size`.
  - Eksekusi 2 query secara paralel (`Promise.all`): 
    - `findMany` untuk mengambil produk (bisa di-include `ProductVariant` jika perlu untuk menampilkan harga mulai dari).
    - `count` untuk total seluruh produk sesuai filter.
  - Return hasil dengan format objek: `{ data: products, paging: { page, total_item, total_page } }`.

- **`getBySlug(slug)`**:
  - Lakukan validasi input `slug` menggunakan `getProductValidation`.
  - Eksekusi `prisma.product.findUnique` dengan kondisi `slug`.
  - **Relasi yang wajib di-include (`include` Prisma)**:
    - `ProductVariant` (lakukan include secara bersarang/nested include ke dalam `Flavor` dan `Size` untuk mendapatkan nama rasa & ukuran).
    - `Review` (Jika model `Review` sudah ada di schema. Jika belum, abaikan dulu atau berikan komen TODO untuk tahap 9).
  - Jika produk tidak ditemukan, throw `new ResponseError(404, "Produk tidak ditemukan")`.
  - Return data produk tersebut.

### 3. Implementasi Handler (Controller)
**File:** `backend/src/controller/product-controller.js`

Tambahkan 2 method controller baru:

- **`search(req, res, next)`**:
  - Ambil parameter dari `req.query` (yaitu `page`, `size`, `name`).
  - Kirim request tersebut ke `productService.search(request)`.
  - Return response standard: `res.status(200).json({ data: result.data, paging: result.paging })`.
  - Selalu bungkus kode dalam blok `try...catch` dan lempar error ke `next(e)` jika terjadi exception.

- **`getBySlug(req, res, next)`**:
  - Ambil nilai `slug` dari `req.params.slug`.
  - Panggil `productService.getBySlug(slug)`.
  - Return response standard: `res.status(200).json({ data: result })`.
  - Selalu bungkus kode dalam blok `try...catch` dan lempar error ke `next(e)` jika terjadi exception.

### 4. Daftarkan Rute (Router)
**File:** `backend/src/routes/public-api.js`

Router ini digunakan untuk API publik tanpa pengecekan middleware token/Auth.
Tambahkan endpoint berikut:

```javascript
import express from 'express';
import productController from '../controller/product-controller.js';

export const publicRouter = express.Router();

// Route untuk fitur public products
publicRouter.get('/api/products', productController.search);
publicRouter.get('/api/products/:slug', productController.getBySlug);
```

> **Catatan:** Pastikan `publicRouter` sudah diregistrasikan di `backend/src/application/web.js` dengan `app.use(publicRouter)`.

### 5. Buat Unit Test (Testing)
**File:** `backend/tests/product-public.test.js`

Buat automated testing menggunakan Jest dan Supertest untuk menjamin API stabil.

- **Setup Data (Test Util)**: Buat `createTestProduct()`, `createTestProductVariant()`, dan metode penghapusan di `afterEach()`.
- **Skenario `GET /api/products`**:
  1. Harus bisa mengembalikan list produk default (page 1, size 10) beserta property `paging`.
  2. Harus bisa mencari produk spesifik berdasarkan query param `?name=...`.
  3. Harus memproses pagination (perubahan `page` dan `size`) dengan benar.
- **Skenario `GET /api/products/:slug`**:
  1. Harus bisa mengembalikan detail produk secara utuh (beserta `ProductVariant`, `Flavor`, dan `Size`) jika `slug` valid.
  2. Harus mengembalikan error HTTP `404` jika `slug` tidak terdaftar atau tidak valid.

---

## ✅ Kriteria Penerimaan (Acceptance Criteria)

- [ ] Skema Zod sudah diatur dan menghasilkan pesan error bahasa Indonesia.
- [ ] Logic Service dapat melakukan filter name case-insensitive & memproses return `paging`.
- [ ] Endpoint `/api/products` dan `/api/products/:slug` sukses berjalan lewat `publicRouter`.
- [ ] Jika slug salah/tidak ada, API memberikan status 404 Not Found dengan struktur JSON `error: ...`.
- [ ] Semua perubahan diberi dokumentasi (komentar/docstring) yang jelas memakai bahasa Indonesia.
- [ ] Minimal 5 unit tests (`GET /api/products` dan `GET /api/products/:slug`) lulus (PASSED) dengan benar.

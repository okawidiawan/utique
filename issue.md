# Implementasi Fitur Tahap 2: Master Data Admin (Flavor, Size, Product, Variant)

Dokumen ini adalah panduan detail untuk mengimplementasikan fitur Tahap 2 pada backend Utique. Anda akan membuat API untuk mengelola master data produk (Flavor, Size, Product, dan Product Variant) yang hanya dapat diakses oleh Admin.

## Tujuan
Membuat endpoint API CRUD untuk entitas `Flavor`, `Size`, `Product`, dan `ProductVariant` yang dilengkapi dengan validasi input (Zod), interaksi database (Prisma), dan ditutupi oleh unit test.

## Prasyarat & Konvensi
1. **Konvensi Kode**:
   - Controller: `backend/src/controller/[nama]-controller.js`
   - Service: `backend/src/services/[nama]-service.js`
   - Validation: `backend/src/validation/[nama]-validation.js`
   - Route: `backend/src/routes/admin-api.js` (Gunakan `adminRouter`)
2. **Keamanan**:
   - Semua route di tahap ini **wajib** menggunakan `authMiddleware` dan `adminMiddleware`. Ini sudah disetup di `admin-api.js`, jadi Anda hanya perlu mendaftarkan route-nya.
3. **Validasi**:
   - Lakukan validasi input menggunakan Zod di layer **Service**.
   - Pesan error Zod wajib dalam **Bahasa Indonesia**.
4. **Error Handling**:
   - Lempar `ResponseError` dari `src/error/response-error.js` jika ada error logika bisnis (misal: data tidak ditemukan).
5. **Testing**:
   - Buat file test di `backend/tests/[nama].test.js`.
   - Wajib ada test untuk setiap endpoint (berhasil, gagal validasi, gagal error spesifik).
   - Selalu bersihkan data testing di `beforeEach` dan `afterEach`.

---

## 1. Master Data: Flavor (Rasa)

### A. Endpoint 1: Tambah Rasa Baru
- **Route**: `POST /api/admin/flavors`
- **Request Body**:
  ```json
  { "name": "Choco Chip" }
  ```
- **Validasi Zod** (`createFlavorValidation`):
  - `name`: string, min 1 ("Nama rasa wajib diisi."), max 50.
- **Logika Service** (`flavor-service.js` - `create`):
  1. Validasi request.
  2. Cek apakah rasa dengan `name` tersebut sudah ada di database (`prisma.flavor.count`). Jika ya, lempar `ResponseError(400, "Rasa sudah ada.")`.
  3. Simpan ke database (`prisma.flavor.create`).
- **Response Sukses** (201 Created):
  ```json
  { "data": { "id": 1, "name": "Choco Chip", "createdAt": "..." } }
  ```

### B. Endpoint 2: Ambil List Rasa
- **Route**: `GET /api/admin/flavors`
- **Logika Service** (`flavor-service.js` - `list`):
  - Ambil semua rasa dari database, diurutkan berdasarkan `createdAt` asc atau `name` asc (`prisma.flavor.findMany`).
- **Response Sukses** (200 OK):
  ```json
  { "data": [ { "id": 1, "name": "Choco Chip", "createdAt": "..." } ] }
  ```

---

## 2. Master Data: Size (Ukuran)

### A. Endpoint 1: Tambah Ukuran Baru
- **Route**: `POST /api/admin/sizes`
- **Request Body**:
  ```json
  { "name": "Small", "description": "10pcs" }
  ```
- **Validasi Zod** (`createSizeValidation`):
  - `name`: string, min 1 ("Nama ukuran wajib diisi."), max 50.
  - `description`: string, max 100, optional.
- **Logika Service** (`size-service.js` - `create`):
  1. Validasi request.
  2. Cek duplikasi `name` (misal: "Small" tidak boleh dua kali). Jika ada, lempar `ResponseError(400, "Ukuran sudah ada.")`.
  3. Simpan ke database.
- **Response Sukses** (201 Created):
  ```json
  { "data": { "id": 1, "name": "Small", "description": "10pcs", "createdAt": "..." } }
  ```

### B. Endpoint 2: Ambil List Ukuran
- **Route**: `GET /api/admin/sizes`
- **Logika Service** (`size-service.js` - `list`):
  - Ambil semua ukuran dari database.
- **Response Sukses** (200 OK):
  ```json
  { "data": [ { "id": 1, "name": "Small", "description": "10pcs" } ] }
  ```

---

## 3. Master Data: Product

*Catatan: Endpoint Product ini akan lebih kompleks karena membutuhkan handling Upload File. Anda dapat membuat mock-up endpoint jika sistem upload (Cloudinary) akan dikerjakan terpisah, atau langsung menggunakan `multer` (opsional jika dikoordinasikan).*

### A. Endpoint 1: Tambah Produk Baru
- **Route**: `POST /api/admin/products`
- **Request Body**:
  - `name`: string
  - `description`: string (optional)
  - `productionTimeDays`: number (default 3)
  - `isAvailable`: boolean (default true)
  - `imageUrl`: string (Untuk saat ini, terima berupa string URL foto).
- **Validasi Zod** (`createProductValidation`):
  - `name`: string, min 1, max 100.
  - `description`: string, optional.
  - `productionTimeDays`: number, min 1, optional (default: 3).
  - `isAvailable`: boolean, optional (default: true).
  - `imageUrl`: string url / optional.
- **Logika Service** (`product-service.js` - `create`):
  1. Validasi request.
  2. Buat `slug` otomatis dari `name` (misal: "Cookies Classic" -> "cookies-classic").
  3. Cek apakah `slug` sudah dipakai. Jika ya, lempar `ResponseError(400, "Nama produk sudah digunakan (slug duplikat).")`.
  4. Simpan ke database.
- **Response Sukses** (201 Created): Data produk yang baru dibuat.

### B. Endpoint 2: Update Produk
- **Route**: `PATCH /api/admin/products/:id`
- **Request Body**: Field produk yang mau diupdate (optional).
- **Validasi Zod** (`updateProductValidation`): Mirip seperti `create` tapi semuanya `.optional()`. Jangan lupa sertakan validasi untuk param `:id` harus berupa number/string numerik.
- **Logika Service** (`product-service.js` - `update`):
  1. Validasi `id` dan body.
  2. Pastikan produk exist. Lempar 404 jika tidak.
  3. Jika ganti `name`, re-generate `slug` dan cek duplikat `slug` dengan `NOT { id: id }`.
  4. Update produk di database.

### C. Endpoint 3: Hapus Produk
- **Route**: `DELETE /api/admin/products/:id`
- **Logika Service** (`product-service.js` - `remove`):
  1. Validasi `id`.
  2. Cek eksistensi produk. Lempar 404 jika tidak.
  3. Hapus produk. (Pastikan Prisma cascade delete berjalan untuk varian, atau hapus varian terlebih dahulu manual di transaksi prisma jika dibutuhkan).
- **Response Sukses** (200 OK): `{ "data": "OK" }`

---

## 4. Master Data: Product Variant

Varian adalah kombinasi unik dari (Product, Flavor, Size).

### A. Endpoint 1: Tambah Varian ke Produk
- **Route**: `POST /api/admin/products/:id/variants`
- **Request Body**:
  ```json
  {
    "flavorId": 1,
    "sizeId": 2,
    "price": 25000,
    "isAvailable": true
  }
  ```
- **Validasi Zod** (`createVariantValidation`):
  - `productId`: number (dari param url)
  - `flavorId`: number
  - `sizeId`: number
  - `price`: number, min 1
  - `isAvailable`: boolean, default true
- **Logika Service** (`variant-service.js` - `create`):
  1. Validasi request.
  2. Pastikan `productId` valid dan ada. Lempar 404 jika produk tidak ada.
  3. Pastikan `flavorId` dan `sizeId` valid dan ada di database. Lempar 400 jika tidak.
  4. Cek kombinasi (productId, flavorId, sizeId) apakah sudah ada di database (`prisma.productVariant.findUnique`). Kombinasi ini memiliki constraint unique di schema. Jika sudah ada, lempar 400.
  5. Simpan ke database (`prisma.productVariant.create`).
- **Response Sukses** (201 Created).

### B. Endpoint 2: Update Varian
- **Route**: `PATCH /api/admin/variants/:id`
- **Request Body**:
  ```json
  { "price": 30000, "isAvailable": false }
  ```
- **Validasi Zod** (`updateVariantValidation`):
  - `price`: number, optional
  - `isAvailable`: boolean, optional
- **Logika Service** (`variant-service.js` - `update`):
  1. Validasi `id` varian dan request body.
  2. Cek apakah varian ada. Lempar 404 jika tidak.
  3. Update data.

### C. Endpoint 3: Hapus Varian
- **Route**: `DELETE /api/admin/variants/:id`
- **Logika Service** (`variant-service.js` - `remove`):
  1. Validasi `id` varian.
  2. Cek keberadaan varian. 404 jika tidak ada.
  3. Hapus varian.

---

## Langkah-langkah Implementasi yang Disarankan:
1. Mulai dari **Flavor** (Validation -> Service -> Controller -> Routes -> Unit Test).
2. Lanjut ke **Size** (Langkah sama seperti Flavor).
3. Lanjut ke **Product** (Jangan lupa penanganan slug otomatis).
4. Akhiri dengan **Product Variant** (Perhatikan relasinya dengan Product, Flavor, dan Size).
5. Uji semua endpoint menggunakan Postman / via Unit Test (`npm run test`).
6. Perbarui dokumentasi (termasuk JSDoc pada setiap method/fungsi baru di service).

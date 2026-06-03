# Feature: Implementasi API Manajemen Order Admin (Tahap 8)

---

## 1. Background & Tujuan

Saat ini admin hanya bisa melakukan verifikasi/penolakan pembayaran (Tahap 7), tetapi belum bisa melihat daftar order secara menyeluruh maupun mengelola status order setelah pembayaran dikonfirmasi.

Tahap 8 ini mengimplementasikan fitur manajemen order untuk admin, yang mencakup:

- Melihat semua order yang masuk (dengan filter status)
- Melihat detail satu order secara lengkap
- Mengubah status order secara manual (misalnya dari `PAID` ke `IN_QUEUE`, `IN_QUEUE` ke `IN_PRODUCTION`, dst.)
- Menginput informasi pengiriman (nomor resi dan nama kurir)
- Meng-override estimasi tanggal selesai produksi

Fitur ini adalah fondasi dari halaman `/admin/orders` dan `/admin/orders/:id` di frontend.

---

## 2. Spesifikasi Teknis

### Daftar Endpoint

| No | Method | Endpoint | Deskripsi | Auth |
| :- | :----- | :------- | :-------- | :--- |
| 32 | GET | `/api/admin/orders` | Ambil semua order (filter status, paginasi) | Admin |
| 33 | GET | `/api/admin/orders/:id` | Ambil detail satu order | Admin |
| 34 | PATCH | `/api/admin/orders/:id/status` | Ubah status order | Admin |
| 35 | PATCH | `/api/admin/orders/:id/shipping` | Input nomor resi & kurir | Admin |
| 36 | PATCH | `/api/admin/orders/:id/estimation` | Override estimasi tanggal selesai | Admin |

### Auth

Semua endpoint memerlukan header:
```
Authorization: Bearer <admin_token>
```
Middleware yang digunakan: `authMiddleware` + pengecekan `user.role === 'ADMIN'` (sudah diimplementasi di tahap sebelumnya via `adminRouter`).

---

### Endpoint 32 — GET /api/admin/orders

**Deskripsi:** Mengambil semua order dari seluruh user. Admin dapat memfilter berdasarkan status dan melakukan paginasi.

**Query Parameters:**

| Parameter | Tipe | Wajib | Default | Keterangan |
| :-------- | :--- | :---- | :------ | :--------- |
| `status` | string | Tidak | (semua) | Filter berdasarkan status order. Nilai valid: `PENDING_PAYMENT`, `PAID`, `IN_QUEUE`, `IN_PRODUCTION`, `DONE`, `SHIPPED`, `COMPLETED`, `CANCELLED` |
| `page` | number | Tidak | `1` | Halaman data |
| `size` | number | Tidak | `10` | Jumlah data per halaman |

**Contoh Request:**
```
GET /api/admin/orders?status=PAID&page=1&size=10
Authorization: Bearer <admin_token>
```

**Contoh Response Sukses (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "status": "PAID",
      "total_price": 150000,
      "shipping_courier": "JNE",
      "created_at": "2025-06-01T10:00:00.000Z",
      "payment_deadline": "2025-06-02T10:00:00.000Z",
      "user": {
        "id": 1,
        "name": "Budi Santoso",
        "email": "budi@example.com",
        "phone": "08123456789"
      }
    }
  ],
  "paging": {
    "page": 1,
    "total_item": 1,
    "total_page": 1
  }
}
```

**Contoh Response Error:**
```json
{ "error": "Unauthorized" }       // 401 - tidak ada token
{ "error": "Forbidden" }          // 403 - bukan admin
{ "error": "Status tidak valid" } // 400 - nilai status tidak dikenal
```

---

### Endpoint 33 — GET /api/admin/orders/:id

**Deskripsi:** Mengambil detail lengkap satu order berdasarkan ID, termasuk item, informasi user, alamat pengiriman, dan data pembayaran.

**Path Parameter:**
- `id` (number, wajib) — ID order

**Contoh Request:**
```
GET /api/admin/orders/1
Authorization: Bearer <admin_token>
```

**Contoh Response Sukses (200 OK):**
```json
{
  "data": {
    "id": 1,
    "status": "PAID",
    "total_price": 150000,
    "shipping_courier": "JNE",
    "shipping_tracking_number": null,
    "estimated_completion_date": "2025-06-05",
    "notes": null,
    "created_at": "2025-06-01T10:00:00.000Z",
    "payment_deadline": "2025-06-02T10:00:00.000Z",
    "user": {
      "id": 1,
      "name": "Budi Santoso",
      "email": "budi@example.com",
      "phone": "08123456789"
    },
    "address": {
      "label": "Rumah",
      "recipient_name": "Budi",
      "phone": "08123456789",
      "province": "Jawa Barat",
      "city": "Bandung",
      "district": "Coblong",
      "postal_code": "40132",
      "full_address": "Jl. Ganesha No 10"
    },
    "items": [
      {
        "id": 1,
        "quantity": 2,
        "price": 75000,
        "product_name": "Classic Choco Cookies",
        "flavor_name": "Double Choco",
        "size_name": "Large Jar"
      }
    ],
    "payment": {
      "id": 1,
      "status": "VERIFIED",
      "proof_image_url": "https://cloudinary.com/...",
      "verified_at": "2025-06-01T12:00:00.000Z",
      "notes": "Sudah masuk Rp 150.000"
    }
  }
}
```

**Contoh Response Error:**
```json
{ "error": "Order tidak ditemukan" } // 404
{ "error": "Unauthorized" }          // 401
{ "error": "Forbidden" }             // 403
```

---

### Endpoint 34 — PATCH /api/admin/orders/:id/status

**Deskripsi:** Mengubah status order secara manual. Transisi status harus mengikuti alur yang valid (lihat aturan validasi di bawah).

**Path Parameter:**
- `id` (number, wajib) — ID order

**Request Body:**
```json
{
  "status": "IN_QUEUE"
}
```

**Aturan Transisi Status yang Valid:**

Implementor wajib memvalidasi bahwa transisi status hanya boleh maju satu langkah dalam alur berikut, dan tidak boleh melompat atau mundur:

```
PAID → IN_QUEUE → IN_PRODUCTION → DONE → SHIPPED → COMPLETED
```

Status `PENDING_PAYMENT` dan `CANCELLED` tidak bisa diubah oleh endpoint ini. Hanya status di atas yang boleh menjadi target transisi.

Contoh: Jika status saat ini `PAID`, maka `status` baru yang diterima hanya `IN_QUEUE`. Selain itu, kembalikan error 400.

**Contoh Request:**
```
PATCH /api/admin/orders/1/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{ "status": "IN_QUEUE" }
```

**Contoh Response Sukses (200 OK):**
```json
{
  "data": {
    "id": 1,
    "status": "IN_QUEUE",
    "updated_at": "2025-06-02T08:00:00.000Z"
  }
}
```

**Contoh Response Error:**
```json
{ "error": "Order tidak ditemukan" }         // 404
{ "error": "Transisi status tidak valid" }   // 400 - melanggar aturan transisi
{ "error": "Status wajib diisi" }            // 400 - body kosong
```

---

### Endpoint 35 — PATCH /api/admin/orders/:id/shipping

**Deskripsi:** Admin menginput nomor resi pengiriman dan nama kurir. Endpoint ini hanya bisa dipanggil ketika status order adalah `SHIPPED` atau `DONE` (barang sudah siap atau sedang dikirim).

**Path Parameter:**
- `id` (number, wajib) — ID order

**Request Body:**
```json
{
  "shipping_tracking_number": "JNE123456789",
  "shipping_courier": "JNE"
}
```

| Field | Tipe | Wajib | Keterangan |
| :---- | :--- | :---- | :--------- |
| `shipping_tracking_number` | string | Ya | Nomor resi dari jasa ekspedisi |
| `shipping_courier` | string | Ya | Nama kurir (JNE, J&T, Sicepat, dll) |

**Contoh Request:**
```
PATCH /api/admin/orders/1/shipping
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "shipping_tracking_number": "JNE123456789",
  "shipping_courier": "JNE"
}
```

**Contoh Response Sukses (200 OK):**
```json
{
  "data": {
    "id": 1,
    "shipping_tracking_number": "JNE123456789",
    "shipping_courier": "JNE",
    "updated_at": "2025-06-03T09:00:00.000Z"
  }
}
```

**Contoh Response Error:**
```json
{ "error": "Order tidak ditemukan" }                         // 404
{ "error": "Nomor resi wajib diisi" }                        // 400
{ "error": "Kurir wajib diisi" }                             // 400
{ "error": "Resi hanya bisa diinput pada status DONE atau SHIPPED" } // 400
```

---

### Endpoint 36 — PATCH /api/admin/orders/:id/estimation

**Deskripsi:** Admin meng-override estimasi tanggal selesai produksi secara manual. Berguna jika ada kendala produksi atau percepatan. Hanya berlaku jika status order masih dalam proses produksi (`IN_QUEUE` atau `IN_PRODUCTION`).

**Path Parameter:**
- `id` (number, wajib) — ID order

**Request Body:**
```json
{
  "estimated_completion_date": "2025-06-10"
}
```

| Field | Tipe | Wajib | Keterangan |
| :---- | :--- | :---- | :--------- |
| `estimated_completion_date` | string (format: `YYYY-MM-DD`) | Ya | Tanggal estimasi selesai produksi |

**Aturan Validasi:**
- Tanggal tidak boleh di masa lalu (harus >= hari ini)
- Format harus `YYYY-MM-DD`
- Status order harus `IN_QUEUE` atau `IN_PRODUCTION`

**Contoh Request:**
```
PATCH /api/admin/orders/1/estimation
Authorization: Bearer <admin_token>
Content-Type: application/json

{ "estimated_completion_date": "2025-06-10" }
```

**Contoh Response Sukses (200 OK):**
```json
{
  "data": {
    "id": 1,
    "estimated_completion_date": "2025-06-10",
    "updated_at": "2025-06-02T08:30:00.000Z"
  }
}
```

**Contoh Response Error:**
```json
{ "error": "Order tidak ditemukan" }                                             // 404
{ "error": "Estimasi tanggal wajib diisi" }                                      // 400
{ "error": "Format tanggal tidak valid, gunakan format YYYY-MM-DD" }             // 400
{ "error": "Estimasi tidak boleh di masa lalu" }                                 // 400
{ "error": "Estimasi hanya bisa diubah pada status IN_QUEUE atau IN_PRODUCTION" } // 400
```

---

## 3. Step-by-Step Implementasi

> Kerjakan secara berurutan. Setiap langkah bergantung pada langkah sebelumnya.

### Langkah 1 — Buat file validasi Zod

**File:** `backend/src/validation/admin-order-validation.js`

Buat file baru berisi skema Zod untuk memvalidasi input dari setiap endpoint. Ikuti konvensi penamaan `[aksi][Domain]Validation`.

```js
// Contoh struktur file
import { z } from 'zod';

// Validasi untuk filter list order (query params)
export const getAdminOrdersValidation = z.object({ ... });

// Validasi untuk update status
export const updateOrderStatusValidation = z.object({ ... });

// Validasi untuk input info pengiriman
export const updateOrderShippingValidation = z.object({ ... });

// Validasi untuk override estimasi
export const updateOrderEstimationValidation = z.object({ ... });
```

Detail isi masing-masing skema:

**`getAdminOrdersValidation`:**
- `status`: string, opsional. Jika diisi, harus salah satu dari enum: `PENDING_PAYMENT`, `PAID`, `IN_QUEUE`, `IN_PRODUCTION`, `DONE`, `SHIPPED`, `COMPLETED`, `CANCELLED`. Pesan error: `"Status tidak valid"`
- `page`: number (dicoerce dari string), opsional, min 1, default 1. Pesan error: `"Halaman minimal 1"`
- `size`: number (dicoerce dari string), opsional, min 1, max 100, default 10. Pesan error: `"Ukuran halaman minimal 1"`, `"Ukuran halaman maksimal 100"`

**`updateOrderStatusValidation`:**
- `status`: string, wajib. Harus salah satu dari: `IN_QUEUE`, `IN_PRODUCTION`, `DONE`, `SHIPPED`, `COMPLETED`. Pesan error: `"Status wajib diisi"`, `"Status tidak valid"`

**`updateOrderShippingValidation`:**
- `shipping_tracking_number`: string, wajib, min 3 karakter. Pesan error: `"Nomor resi wajib diisi"`, `"Nomor resi minimal 3 karakter"`
- `shipping_courier`: string, wajib, min 2 karakter. Pesan error: `"Kurir wajib diisi"`, `"Nama kurir minimal 2 karakter"`

**`updateOrderEstimationValidation`:**
- `estimated_completion_date`: string, wajib, format `YYYY-MM-DD` (validasi dengan regex `^\d{4}-\d{2}-\d{2}$`). Pesan error: `"Estimasi tanggal wajib diisi"`, `"Format tanggal tidak valid, gunakan format YYYY-MM-DD"`

---

### Langkah 2 — Buat file service

**File:** `backend/src/services/admin-order-service.js`

Buat file baru berisi semua logika bisnis untuk manajemen order admin. Semua interaksi dengan database via Prisma **hanya boleh ada di file service ini**, bukan di controller.

Buat 5 fungsi berikut:

**Fungsi 1: `getAllOrders(query)`**
- Panggil `getAdminOrdersValidation.parse(query)` untuk validasi
- Hitung `skip = (page - 1) * size`
- Buat objek `where` dari Prisma: jika `status` ada di query, tambahkan `where.status = status`
- Panggil `prisma.$transaction([prisma.order.findMany(...), prisma.order.count(...)])` secara paralel untuk efisiensi
- `findMany` harus menyertakan relasi: `include: { user: { select: { id, name, email, phone } } }`
- `findMany` harus menggunakan `orderBy: { created_at: 'desc' }` agar order terbaru tampil duluan
- Return data beserta objek `paging: { page, total_item, total_page: Math.ceil(total / size) }`

**Fungsi 2: `getOrderById(id)`**
- Parse `id` ke integer: `const orderId = parseInt(id)`
- Cari order dengan `prisma.order.findUnique({ where: { id: orderId }, include: { ... } })`
- `include` harus menyertakan: `user` (select: id, name, email, phone), `address` (semua field), `items` (semua field dari `OrderItem`), `payment` (semua field)
- Jika order tidak ditemukan (`!order`), lempar `new ResponseError(404, 'Order tidak ditemukan')`
- Return data order

**Fungsi 3: `updateOrderStatus(id, body)`**
- Parse `id` ke integer
- Cari order yang ada dengan `prisma.order.findUnique({ where: { id: orderId } })`
- Jika tidak ada, lempar `ResponseError(404, 'Order tidak ditemukan')`
- Validasi body dengan `updateOrderStatusValidation.parse(body)`
- **Validasi transisi status:** Definisikan peta transisi yang valid:
  ```js
  const validTransitions = {
    PAID: 'IN_QUEUE',
    IN_QUEUE: 'IN_PRODUCTION',
    IN_PRODUCTION: 'DONE',
    DONE: 'SHIPPED',
    SHIPPED: 'COMPLETED',
  };
  ```
  Cek apakah `validTransitions[order.status] === body.status`. Jika tidak, lempar `ResponseError(400, 'Transisi status tidak valid')`
- Update order: `prisma.order.update({ where: { id: orderId }, data: { status: body.status } })`
- Return hasil update (select field: id, status, updated_at)

**Fungsi 4: `updateOrderShipping(id, body)`**
- Parse `id` ke integer
- Cari order yang ada
- Jika tidak ada, lempar `ResponseError(404, 'Order tidak ditemukan')`
- Validasi body dengan `updateOrderShippingValidation.parse(body)`
- **Validasi status:** Status order harus `DONE` atau `SHIPPED`. Jika tidak, lempar `ResponseError(400, 'Resi hanya bisa diinput pada status DONE atau SHIPPED')`
- Update order: `prisma.order.update({ where: { id: orderId }, data: { shipping_tracking_number, shipping_courier } })`
- Return hasil update (select field: id, shipping_tracking_number, shipping_courier, updated_at)

**Fungsi 5: `updateOrderEstimation(id, body)`**
- Parse `id` ke integer
- Cari order yang ada
- Jika tidak ada, lempar `ResponseError(404, 'Order tidak ditemukan')`
- Validasi body dengan `updateOrderEstimationValidation.parse(body)`
- **Validasi tanggal tidak di masa lalu:**
  ```js
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inputDate = new Date(body.estimated_completion_date);
  if (inputDate < today) throw new ResponseError(400, 'Estimasi tidak boleh di masa lalu');
  ```
- **Validasi status:** Status order harus `IN_QUEUE` atau `IN_PRODUCTION`. Jika tidak, lempar `ResponseError(400, 'Estimasi hanya bisa diubah pada status IN_QUEUE atau IN_PRODUCTION')`
- Update order dengan `prisma.order.update(...)`, simpan `estimated_completion_date` sebagai objek `Date` baru: `new Date(body.estimated_completion_date)`
- Return hasil update (select field: id, estimated_completion_date, updated_at)

---

### Langkah 3 — Buat file controller

**File:** `backend/src/controller/admin-order-controller.js`

Buat file baru berisi handler HTTP untuk setiap endpoint. Controller hanya bertugas menerima request, memanggil service, dan mengembalikan response. Tidak ada logika bisnis di sini.

```js
import * as adminOrderService from '../services/admin-order-service.js';

// Handler untuk GET /api/admin/orders
export const getAll = async (req, res, next) => {
  try {
    const result = await adminOrderService.getAllOrders(req.query);
    res.status(200).json(result); // result sudah berisi { data, paging }
  } catch (e) {
    next(e);
  }
};

// Handler untuk GET /api/admin/orders/:id
export const getById = async (req, res, next) => {
  try {
    const result = await adminOrderService.getOrderById(req.params.id);
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};

// Handler untuk PATCH /api/admin/orders/:id/status
export const updateStatus = async (req, res, next) => {
  try {
    const result = await adminOrderService.updateOrderStatus(req.params.id, req.body);
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};

// Handler untuk PATCH /api/admin/orders/:id/shipping
export const updateShipping = async (req, res, next) => {
  try {
    const result = await adminOrderService.updateOrderShipping(req.params.id, req.body);
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};

// Handler untuk PATCH /api/admin/orders/:id/estimation
export const updateEstimation = async (req, res, next) => {
  try {
    const result = await adminOrderService.updateOrderEstimation(req.params.id, req.body);
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};
```

---

### Langkah 4 — Daftarkan route di admin router

**File:** `backend/src/routes/admin-api.js` (atau nama file admin router yang sudah ada)

Tambahkan import controller dan daftarkan 5 route baru di bawah route yang sudah ada. Jangan hapus atau ubah route yang sudah ada.

```js
import * as adminOrderController from '../controller/admin-order-controller.js';

// Tambahkan baris berikut di dalam definisi adminRouter
adminRouter.get('/admin/orders', adminOrderController.getAll);
adminRouter.get('/admin/orders/:id', adminOrderController.getById);
adminRouter.patch('/admin/orders/:id/status', adminOrderController.updateStatus);
adminRouter.patch('/admin/orders/:id/shipping', adminOrderController.updateShipping);
adminRouter.patch('/admin/orders/:id/estimation', adminOrderController.updateEstimation);
```

> **Catatan penting urutan route:** Pastikan route dengan path statis (misalnya `/admin/orders/something-static`) didaftarkan **sebelum** route dengan parameter dinamis `/admin/orders/:id` untuk menghindari konflik routing. Dalam kasus ini tidak ada konflik karena semua sub-path di bawah `:id` berbeda (`/status`, `/shipping`, `/estimation`).

---

### Langkah 5 — Buat unit test

**File:** `backend/tests/admin-order.test.js`

Buat file test baru menggunakan framework testing yang sudah dipakai di project (sesuaikan dengan yang ada, misalnya Jest atau Bun test). Buat minimal satu test case per skenario berikut:

**Test untuk GET /api/admin/orders:**
- [ ] Berhasil mengambil semua order tanpa filter (response 200, data adalah array, ada field `paging`)
- [ ] Berhasil filter berdasarkan `status=PAID` (semua item di `data` memiliki status `PAID`)
- [ ] Gagal jika `status` bukan nilai yang valid (response 400)
- [ ] Gagal jika tidak ada token (response 401)
- [ ] Gagal jika token bukan admin (response 403)

**Test untuk GET /api/admin/orders/:id:**
- [ ] Berhasil mengambil detail order yang ada (response 200, ada field `items`, `payment`, `address`, `user`)
- [ ] Gagal jika `id` tidak ada di database (response 404, pesan `"Order tidak ditemukan"`)

**Test untuk PATCH /api/admin/orders/:id/status:**
- [ ] Berhasil mengubah status dari `PAID` ke `IN_QUEUE` (response 200)
- [ ] Gagal jika transisi tidak valid, misalnya dari `PAID` langsung ke `SHIPPED` (response 400, pesan `"Transisi status tidak valid"`)
- [ ] Gagal jika body kosong / `status` tidak diisi (response 400)

**Test untuk PATCH /api/admin/orders/:id/shipping:**
- [ ] Berhasil menginput resi ketika status order `DONE` (response 200)
- [ ] Gagal jika status order bukan `DONE` atau `SHIPPED` (response 400)
- [ ] Gagal jika `shipping_tracking_number` tidak diisi (response 400)

**Test untuk PATCH /api/admin/orders/:id/estimation:**
- [ ] Berhasil mengubah estimasi ketika status `IN_QUEUE` (response 200)
- [ ] Gagal jika tanggal di masa lalu (response 400, pesan `"Estimasi tidak boleh di masa lalu"`)
- [ ] Gagal jika format tanggal salah, misalnya `"10-06-2025"` (response 400)
- [ ] Gagal jika status bukan `IN_QUEUE` atau `IN_PRODUCTION` (response 400)

---

### Langkah 6 — Update dokumentasi manual test

**File:** `manual-test-api.md`

Tambahkan seksi baru di bagian paling bawah file dengan format yang sudah ada:

```markdown
## Tahap 8: Manajemen Order Admin

### List Semua Order (Admin)
- **URL:** `GET http://localhost:5000/api/admin/orders`
- **Headers:** `Authorization: Bearer <admin_token>`
- **Query Params:** `?status=PAID&page=1&size=10`
...
```

Isi selengkapnya mengikuti format seksi lain di file tersebut (URL, Headers, Body, Response Sukses, Response Error untuk setiap endpoint).

---

### Langkah 7 — Update CONTEXT.md

**File:** `CONTEXT.md`

Di bagian **"7. Status Progress API" > "Tahap 8"**, ubah semua checkbox endpoint yang sudah diimplementasi dari `[ ]` menjadi `[x]`:

```markdown
### Tahap 8 — Manajemen Order Admin

32. [x] `GET /api/admin/orders` — Mengambil semua order (filter status)
33. [x] `GET /api/admin/orders/:id` — Mengambil detail order
34. [x] `PATCH /api/admin/orders/:id/status` — Mengubah status order
35. [x] `PATCH /api/admin/orders/:id/shipping` — Input info pengiriman (resi, kurir)
36. [x] `PATCH /api/admin/orders/:id/estimation` — Override estimasi pembuatan
```

---

## 4. Acceptance Criteria

### Fungsionalitas

- [ ] `GET /api/admin/orders` mengembalikan semua order dengan struktur `{ data: [...], paging: {...} }`
- [ ] `GET /api/admin/orders` dengan query `?status=PAID` hanya mengembalikan order dengan status `PAID`
- [ ] `GET /api/admin/orders` dengan query `?status=INVALID` mengembalikan 400 dengan pesan error
- [ ] `GET /api/admin/orders` mengembalikan data `user` (id, name, email, phone) di setiap item
- [ ] `GET /api/admin/orders/:id` mengembalikan detail order dengan relasi `user`, `address`, `items`, dan `payment`
- [ ] `GET /api/admin/orders/:id` dengan ID yang tidak ada mengembalikan 404
- [ ] `PATCH /api/admin/orders/:id/status` berhasil mengubah status jika transisi valid
- [ ] `PATCH /api/admin/orders/:id/status` mengembalikan 400 jika transisi tidak valid (misalnya `PAID` → `SHIPPED`)
- [ ] `PATCH /api/admin/orders/:id/shipping` berhasil menyimpan resi dan kurir jika status `DONE` atau `SHIPPED`
- [ ] `PATCH /api/admin/orders/:id/shipping` mengembalikan 400 jika status bukan `DONE` atau `SHIPPED`
- [ ] `PATCH /api/admin/orders/:id/estimation` berhasil menyimpan estimasi jika status `IN_QUEUE` atau `IN_PRODUCTION` dan tanggal valid
- [ ] `PATCH /api/admin/orders/:id/estimation` mengembalikan 400 jika tanggal di masa lalu
- [ ] `PATCH /api/admin/orders/:id/estimation` mengembalikan 400 jika format tanggal bukan `YYYY-MM-DD`

### Keamanan & Auth

- [ ] Semua endpoint mengembalikan 401 jika tidak ada header `Authorization`
- [ ] Semua endpoint mengembalikan 403 jika token valid tetapi bukan admin (role `CUSTOMER`)

### Kualitas Kode

- [ ] Tidak ada logika bisnis atau query Prisma di file controller
- [ ] Semua validasi Zod menggunakan pesan error Bahasa Indonesia
- [ ] Semua fungsi di service dan controller memiliki komentar dokumentasi dalam Bahasa Indonesia
- [ ] Semua unit test berjalan dan lulus (`npm test` atau `bun test`)

### Dokumentasi

- [ ] `manual-test-api.md` diperbarui dengan contoh request dan response untuk semua 5 endpoint baru
- [ ] `CONTEXT.md` diperbarui: checkbox Tahap 8 berubah dari `[ ]` menjadi `[x]`

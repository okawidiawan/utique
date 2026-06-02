# Issue: Feature — Implementasi API Pembayaran (Tahap 7)

## 1. Background & Tujuan

Utique menggunakan sistem pembayaran **manual via transfer bank**. Tidak ada payment gateway otomatis. Alurnya adalah:

1. Customer membuat order → status order `PENDING_PAYMENT`
2. Customer transfer ke rekening toko
3. Customer upload foto/screenshot bukti transfer melalui aplikasi
4. Admin melihat bukti transfer, lalu memverifikasi atau menolak
5. Jika **diverifikasi** → status order berubah menjadi `PAID`
6. Jika **ditolak** (misal: kurang bayar, bukti tidak jelas, salah rekening) → status payment `REJECTED`, customer bisa upload ulang bukti baru

Fitur ini mencakup 3 endpoint:
- `POST /api/orders/:orderId/payment` — Customer upload bukti pembayaran
- `PATCH /api/admin/payments/:id/verify` — Admin verifikasi pembayaran
- `PATCH /api/admin/payments/:id/reject` — Admin tolak pembayaran

---

## 2. Spesifikasi Teknis

### Status Flow yang Terlibat

```
Order:    PENDING_PAYMENT ──(verify)──► PAID
                          ◄─(reject)── (tetap PENDING_PAYMENT, bisa upload ulang)

Payment:  PENDING ──► VERIFIED
                 └──► REJECTED
```

---

### Endpoint 1 — Upload Bukti Pembayaran

```
POST /api/orders/:orderId/payment
Authorization: Bearer <token-customer>
Content-Type: multipart/form-data
```

**Request — multipart/form-data**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `proof_image` | File (jpg/png/webp) | ✅ | Foto bukti transfer, maks 2MB |

**Response — Sukses `201 Created`**
```json
{
  "data": {
    "id": "uuid",
    "orderId": "uuid",
    "proofImageUrl": "https://res.cloudinary.com/...",
    "status": "PENDING",
    "createdAt": "2026-06-03T10:00:00.000Z"
  }
}
```

**Response — Error**

| Kondisi | HTTP | Pesan |
|---|---|---|
| Token tidak valid | `401` | `"Unauthorized"` |
| Order tidak ditemukan / bukan milik user | `404` | `"Pesanan tidak ditemukan."` |
| Order bukan status `PENDING_PAYMENT` | `400` | `"Pesanan ini tidak menunggu pembayaran."` |
| Order sudah melewati `payment_deadline` | `400` | `"Batas waktu pembayaran sudah habis."` |
| Sudah ada payment `PENDING` atau `VERIFIED` | `400` | `"Bukti pembayaran sudah pernah diupload."` |
| File tidak dikirim | `400` | `"Bukti pembayaran wajib diupload."` |
| File bukan gambar | `400` | `"File harus berupa gambar (jpg, png, webp)."` |
| File terlalu besar (> 2MB) | `400` | `"Ukuran file maksimal 2MB."` |

---

### Endpoint 2 — Admin Verifikasi Pembayaran

```
PATCH /api/admin/payments/:id/verify
Authorization: Bearer <token-admin>
Content-Type: application/json
```

**Request Body**
```json
{
  "notes": "Pembayaran sudah masuk Rp 150.000"
}
```

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `notes` | String | ❌ | Catatan admin, opsional, maks 255 karakter |

**Response — Sukses `200 OK`**
```json
{
  "data": "Pembayaran berhasil diverifikasi."
}
```

**Response — Error**

| Kondisi | HTTP | Pesan |
|---|---|---|
| Token tidak valid / bukan admin | `401` | `"Unauthorized"` |
| Payment tidak ditemukan | `404` | `"Data pembayaran tidak ditemukan."` |
| Payment bukan status `PENDING` | `400` | `"Pembayaran ini sudah diproses sebelumnya."` |

---

### Endpoint 3 — Admin Tolak Pembayaran

```
PATCH /api/admin/payments/:id/reject
Authorization: Bearer <token-admin>
Content-Type: application/json
```

**Request Body**
```json
{
  "reason": "Nominal transfer kurang, seharusnya Rp 150.000"
}
```

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `reason` | String | ✅ | Alasan penolakan, wajib diisi, maks 255 karakter |

**Response — Sukses `200 OK`**
```json
{
  "data": "Pembayaran ditolak."
}
```

**Response — Error**

| Kondisi | HTTP | Pesan |
|---|---|---|
| Token tidak valid / bukan admin | `401` | `"Unauthorized"` |
| Payment tidak ditemukan | `404` | `"Data pembayaran tidak ditemukan."` |
| Payment bukan status `PENDING` | `400` | `"Pembayaran ini sudah diproses sebelumnya."` |
| `reason` tidak dikirim | `400` | `"Alasan penolakan wajib diisi."` |

---

## 3. Struktur Folder & Penempatan File

File baru yang perlu dibuat (✨), file yang perlu dimodifikasi (✏️):

```
backend/
├── src/
│   ├── controller/
│   │   ├── payment-controller.js        ✨ Customer: upload bukti bayar
│   │   └── payment-admin-controller.js  ✨ Admin: verify & reject
│   │
│   ├── services/
│   │   ├── payment-service.js           ✨ Logika upload customer
│   │   └── payment-admin-service.js     ✨ Logika verify & reject admin
│   │
│   ├── validation/
│   │   └── payment-validation.js        ✨ Semua schema Zod untuk payment
│   │
│   ├── middleware/
│   │   └── upload-middleware.js         ✏️ Tambah config upload untuk bukti bayar
│   │
│   └── routes/
│       ├── api.js                       ✏️ Tambah POST /api/orders/:orderId/payment
│       └── admin-api.js                 ✏️ Tambah PATCH verify & reject
│
└── tests/
    ├── payment.test.js                  ✨ Test endpoint customer
    └── payment-admin.test.js            ✨ Test endpoint admin
```

---

## 4. Step-by-Step Implementasi

### Step 1 — Buat Validation Schema (`src/validation/payment-validation.js`)

Buat file baru `src/validation/payment-validation.js`. Buat dan export 2 schema Zod:

```js
// Schema untuk admin verify — notes opsional
export const verifyPaymentValidation = z.object({
  notes: z.string().max(255, "Catatan maksimal 255 karakter.").optional(),
});

// Schema untuk admin reject — reason wajib
export const rejectPaymentValidation = z.object({
  reason: z.string({
    required_error: "Alasan penolakan wajib diisi.",
  }).min(1, "Alasan penolakan wajib diisi.").max(255, "Alasan maksimal 255 karakter."),
});
```

> **Catatan**: Validasi file upload tidak dilakukan via Zod — ditangani di middleware upload (Step 2).

---

### Step 2 — Update Upload Middleware (`src/middleware/upload-middleware.js`)

Buka file `upload-middleware.js` yang sudah ada. Tambahkan konfigurasi khusus untuk bukti pembayaran:

- Buat fungsi/middleware baru bernama `uploadPaymentProof`
- Konfigurasi:
  - Hanya terima file dengan `mimetype`: `image/jpeg`, `image/png`, `image/webp`
  - Batas ukuran file: **2MB** (`2 * 1024 * 1024` bytes)
  - Jika file bukan gambar → lempar error dengan pesan `"File harus berupa gambar (jpg, png, webp)."`
  - Jika file terlalu besar → lempar error dengan pesan `"Ukuran file maksimal 2MB."`
  - Upload ke Cloudinary folder: `utique/payments`
  - Field name yang diterima: `proof_image`
- Export `uploadPaymentProof` dari file ini

---

### Step 3 — Buat Payment Service (`src/services/payment-service.js`)

Buat file baru `src/services/payment-service.js`. Buat dan export satu fungsi async `uploadProof(userId, orderId, file)`.

Lakukan langkah berikut secara berurutan:

**3a. Validasi file**
- Jika `file` tidak ada / undefined → lempar `ResponseError(400, "Bukti pembayaran wajib diupload.")`

**3b. Validasi order**
- Query `Order` dengan kondisi `id = orderId AND userId = userId`
- Jika tidak ditemukan → lempar `ResponseError(404, "Pesanan tidak ditemukan.")`
- Jika `order.status !== "PENDING_PAYMENT"` → lempar `ResponseError(400, "Pesanan ini tidak menunggu pembayaran.")`
- Jika `new Date() > order.paymentDeadline` → lempar `ResponseError(400, "Batas waktu pembayaran sudah habis.")`

**3c. Cek duplikasi payment**
- Query `Payment` dengan kondisi:
  ```
  orderId = orderId AND status IN ["PENDING", "VERIFIED"]
  ```
- Jika sudah ada → lempar `ResponseError(400, "Bukti pembayaran sudah pernah diupload.")`
- **Penjelasan logika**: Payment berstatus `REJECTED` boleh ada — artinya customer boleh upload ulang setelah ditolak. Yang tidak boleh adalah upload baru kalau sudah ada yang `PENDING` (menunggu review admin) atau `VERIFIED` (sudah lunas).

**3d. Ambil URL dari hasil upload Cloudinary**
- Middleware upload di Step 2 sudah menjalankan upload ke Cloudinary sebelum fungsi ini dipanggil
- URL hasil upload tersedia di `file.path` atau `file.secure_url` (tergantung konfigurasi middleware yang ada)
- Simpan URL ini sebagai `proofImageUrl`

**3e. Buat record Payment**
- Buat `Payment` baru di database:
  ```
  orderId: orderId
  proofImageUrl: proofImageUrl
  status: "PENDING"
  ```
- Return data payment yang baru dibuat (id, orderId, proofImageUrl, status, createdAt)

---

### Step 4 — Buat Payment Admin Service (`src/services/payment-admin-service.js`)

Buat file baru `src/services/payment-admin-service.js`. Buat dan export 2 fungsi async:

#### Fungsi `verify(paymentId, request)`

**4a. Validasi input**
- Validasi `request` menggunakan `verifyPaymentValidation`

**4b. Cek payment**
- Query `Payment` dengan kondisi `id = paymentId`, sertakan relasi `order`
- Jika tidak ditemukan → lempar `ResponseError(404, "Data pembayaran tidak ditemukan.")`
- Jika `payment.status !== "PENDING"` → lempar `ResponseError(400, "Pembayaran ini sudah diproses sebelumnya.")`

**4c. Jalankan transaksi**
- Gunakan `prisma.$transaction()` untuk 2 operasi berikut sekaligus:
  1. Update `Payment`:
     ```
     status: "VERIFIED"
     notes: request.notes (boleh null)
     verifiedAt: new Date()
     ```
  2. Update `Order` (gunakan `payment.orderId`):
     ```
     status: "PAID"
     ```
- Return string `"Pembayaran berhasil diverifikasi."`

#### Fungsi `reject(paymentId, request)`

**4a. Validasi input**
- Validasi `request` menggunakan `rejectPaymentValidation`

**4b. Cek payment**
- Query `Payment` dengan kondisi `id = paymentId`
- Jika tidak ditemukan → lempar `ResponseError(404, "Data pembayaran tidak ditemukan.")`
- Jika `payment.status !== "PENDING"` → lempar `ResponseError(400, "Pembayaran ini sudah diproses sebelumnya.")`

**4c. Update Payment**
- Update `Payment`:
  ```
  status: "REJECTED"
  rejectionReason: request.reason
  ```
- **Penting**: Order status **tidak diubah** — tetap `PENDING_PAYMENT` agar customer bisa upload ulang bukti baru
- Return string `"Pembayaran ditolak."`

---

### Step 5 — Buat Payment Controller (`src/controller/payment-controller.js`)

Buat file baru `src/controller/payment-controller.js`. Buat dan export satu fungsi async `upload(req, res, next)`:

```js
const upload = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const orderId = req.params.orderId;
    const file = req.file; // tersedia setelah melewati uploadPaymentProof middleware
    const result = await paymentService.uploadProof(userId, orderId, file);
    res.status(201).json({ data: result });
  } catch (e) {
    next(e);
  }
};
```

---

### Step 6 — Buat Payment Admin Controller (`src/controller/payment-admin-controller.js`)

Buat file baru `src/controller/payment-admin-controller.js`. Buat dan export 2 fungsi async:

```js
const verify = async (req, res, next) => {
  try {
    const paymentId = req.params.id;
    const result = await paymentAdminService.verify(paymentId, req.body);
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};

const reject = async (req, res, next) => {
  try {
    const paymentId = req.params.id;
    const result = await paymentAdminService.reject(paymentId, req.body);
    res.status(200).json({ data: result });
  } catch (e) {
    next(e);
  }
};
```

---

### Step 7 — Daftarkan Route

**Di `src/routes/api.js`** — tambahkan route customer:

```js
import paymentController from '../controller/payment-controller.js';
import { uploadPaymentProof } from '../middleware/upload-middleware.js';

// Payment Routes
apiRouter.post(
  '/api/orders/:orderId/payment',
  uploadPaymentProof,           // ← middleware upload HARUS sebelum controller
  paymentController.upload
);
```

> **Penting**: `uploadPaymentProof` middleware harus diletakkan **sebelum** controller. Middleware ini yang menangani parsing `multipart/form-data` dan upload ke Cloudinary. Setelah middleware selesai, hasil upload tersedia di `req.file` untuk diakses oleh controller.

**Di `src/routes/admin-api.js`** — tambahkan route admin:

```js
import paymentAdminController from '../controller/payment-admin-controller.js';

// Payment Admin Routes
adminRouter.patch('/api/admin/payments/:id/verify', paymentAdminController.verify);
adminRouter.patch('/api/admin/payments/:id/reject', paymentAdminController.reject);
```

---

### Step 8 — Buat Unit Test Customer (`tests/payment.test.js`)

Buat file baru `tests/payment.test.js`. Gunakan integration test dengan `supertest`.

**Setup & Teardown**

- `beforeEach`:
  1. Buat user test via `createTestUser()`
  2. Buat product, variant, flavor, size via helper yang sudah ada
  3. Buat cart + cart item
  4. Buat address test
  5. Buat order dulu via `POST /api/orders` agar punya `orderId` valid dengan status `PENDING_PAYMENT`
  6. Simpan `orderId` dari response untuk dipakai di test

- `afterEach`: Hapus semua data test (payment, order, cart, product, address, user) dalam urutan yang benar mengikuti foreign key

**Test Cases yang wajib dibuat:**

```
✅ Berhasil upload bukti pembayaran
   - Kirim multipart/form-data dengan file gambar valid (gunakan buffer/fixture image kecil)
   - Cek response status 201
   - Cek response body memiliki: id, orderId, proofImageUrl, status: "PENDING"
   - proofImageUrl harus berupa string URL yang valid

✅ Gagal jika tidak ada token (401)

✅ Gagal jika orderId bukan milik user yang login (404)

✅ Gagal jika order bukan status PENDING_PAYMENT (400)
   - Update status order ke "PAID" langsung via Prisma, lalu coba upload
   - Expect response 400

✅ Gagal jika order sudah melewati payment_deadline (400)
   - Update paymentDeadline ke masa lalu langsung via Prisma, lalu coba upload
   - Expect response 400

✅ Gagal jika sudah ada payment PENDING untuk order yang sama (400)
   - Upload pertama berhasil (status 201)
   - Upload kedua dengan file yang sama harus gagal dengan status 400

✅ Gagal jika tidak ada file yang dikirim (400)
   - Kirim request tanpa field proof_image
   - Expect response 400
```

---

### Step 9 — Buat Unit Test Admin (`tests/payment-admin.test.js`)

Buat file baru `tests/payment-admin.test.js`.

**Setup & Teardown**

- `beforeEach`:
  1. Buat user + admin test
  2. Buat order dengan status `PENDING_PAYMENT` (buat langsung via Prisma, tidak perlu lewat API)
  3. Buat payment dengan status `PENDING` langsung via Prisma (tidak perlu lewat API upload)
  4. Simpan `paymentId` untuk dipakai di test

- `afterEach`: Hapus semua data test

**Test Cases yang wajib dibuat:**

```
✅ Admin berhasil verifikasi pembayaran
   - Kirim PATCH dengan body kosong (notes opsional)
   - Cek response status 200
   - Cek response data = "Pembayaran berhasil diverifikasi."
   - Query DB: cek Payment.status = "VERIFIED"
   - Query DB: cek Order.status = "PAID"

✅ Admin berhasil verifikasi dengan notes
   - Kirim PATCH dengan body { notes: "Transfer sudah masuk" }
   - Cek response status 200
   - Query DB: cek Payment.notes tersimpan

✅ Gagal verifikasi jika bukan admin (401)
   - Gunakan token customer biasa

✅ Gagal verifikasi jika paymentId tidak ditemukan (404)
   - Gunakan ID yang tidak ada, misal "nonexistent-id"

✅ Gagal verifikasi jika payment bukan status PENDING (400)
   - Update payment status ke "VERIFIED" via Prisma, lalu coba verifikasi lagi
   - Expect response 400

✅ Admin berhasil menolak pembayaran
   - Kirim PATCH dengan body { reason: "Nominal kurang" }
   - Cek response status 200
   - Cek response data = "Pembayaran ditolak."
   - Query DB: cek Payment.status = "REJECTED"
   - Query DB: cek Order.status TETAP "PENDING_PAYMENT" (tidak berubah)

✅ Gagal reject jika reason tidak dikirim (400)
   - Kirim PATCH tanpa body / body kosong

✅ Gagal reject jika payment bukan status PENDING (400)
   - Update payment status ke "REJECTED" via Prisma, lalu coba reject lagi

✅ Gagal reject jika bukan admin (401)
```

---

## 5. Acceptance Criteria

### Fungsionalitas — Upload Bukti Bayar
- [ ] `POST /api/orders/:orderId/payment` berhasil membuat Payment dan mengembalikan status `201`
- [ ] Foto bukti bayar berhasil diupload ke Cloudinary folder `utique/payments`
- [ ] URL foto tersimpan di field `Payment.proofImageUrl`
- [ ] Payment baru selalu dibuat dengan status `PENDING`
- [ ] Customer bisa upload ulang setelah payment sebelumnya `REJECTED`
- [ ] Customer tidak bisa upload jika sudah ada payment `PENDING` atau `VERIFIED`

### Fungsionalitas — Verifikasi Admin
- [ ] `PATCH /api/admin/payments/:id/verify` mengubah `Payment.status` → `VERIFIED`
- [ ] Saat diverifikasi, `Order.status` ikut berubah → `PAID` dalam satu `prisma.$transaction()`
- [ ] Field `notes` opsional — tidak wajib diisi saat verifikasi
- [ ] Tidak bisa verifikasi payment yang sudah `VERIFIED` atau `REJECTED`

### Fungsionalitas — Penolakan Admin
- [ ] `PATCH /api/admin/payments/:id/reject` mengubah `Payment.status` → `REJECTED`
- [ ] Saat ditolak, `Order.status` **tidak berubah** — tetap `PENDING_PAYMENT`
- [ ] Field `reason` wajib diisi saat menolak
- [ ] Tidak bisa menolak payment yang sudah `VERIFIED` atau `REJECTED`

### Validasi & Error Handling
- [ ] Upload tanpa file → `400` dengan pesan Bahasa Indonesia
- [ ] Upload file bukan gambar → `400`
- [ ] Upload file > 2MB → `400`
- [ ] Upload ke order bukan milik user → `404`
- [ ] Upload ke order yang sudah lewat deadline → `400`
- [ ] Reject tanpa `reason` → `400` dengan pesan Bahasa Indonesia
- [ ] Semua endpoint tanpa token → `401`
- [ ] Admin endpoint diakses dengan token customer → `401`

### Keamanan & Konsistensi
- [ ] Verify + update order status dijalankan dalam satu `prisma.$transaction()`
- [ ] Query order selalu menyertakan `userId` (data isolation — customer tidak bisa akses order orang lain)
- [ ] `payment_deadline` dicek dari nilai di DB, bukan dari input client

### Testing
- [ ] Semua test case di Step 8 dan Step 9 sudah dibuat
- [ ] Semua test **lolos** (`bun test` tidak ada yang fail)
- [ ] Order status setelah verify dan reject diverifikasi langsung dari DB (query Prisma), bukan hanya dari response API
- [ ] Tidak ada data test yang tersisa setelah test selesai (`afterEach` bersih)

### Kode
- [ ] Setiap function memiliki komentar dokumentasi dalam Bahasa Indonesia
- [ ] File mengikuti konvensi nama `kebab-case.js`
- [ ] Tidak ada logika database di controller (hanya di service)
- [ ] Error diteruskan ke `next(e)` di controller

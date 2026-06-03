# Review Proyek: Utique — Toko Cookies Online

**Reviewer:** Senior Developer / Tech Lead  
**Tanggal Review:** 3 Juni 2026  
**Scope:** Code Review, Desain Arsitektur, Requirement Review, Security Review  
**Cakupan File:** Seluruh backend (`src/`, `prisma/`, `tests/`) dan frontend (`src/`)

---

## Daftar Isi

- [I. Ringkasan Eksekutif](#i-ringkasan-eksekutif)
- [II. Code Review](#ii-code-review)
- [III. Desain Arsitektur Review](#iii-desain-arsitektur-review)
- [IV. Requirement Review](#iv-requirement-review)
- [V. Security Review](#v-security-review)
- [VI. Rangkuman Prioritas Temuan](#vi-rangkuman-prioritas-temuan)
- [VII. Prompt untuk AI Coding Agent](#vii-prompt-untuk-ai-coding-agent)

---

## I. Ringkasan Eksekutif

Proyek Utique memiliki **fondasi arsitektur backend yang solid** — layered architecture diterapkan dengan konsisten (Router → Controller → Service → Prisma), pemisahan router berdasarkan peran (public/customer/admin) sudah sangat baik, dan validasi Zod tersusun rapi. Prisma schema terstruktur dengan mapping database yang clean, dan test coverage sudah ada untuk semua tahapan API yang telah selesai.

Namun ada beberapa temuan penting yang perlu ditangani sebelum deployment ke production, terutama di area **security** (autentikasi berbasis UUID token, tidak ada token expiration), **data integrity** (race condition pada order number, tidak ada cascade protection), dan **missing critical feature** (auto-cancel cron belum diimplementasi).

Frontend saat ini masih dalam tahap **skeleton/scaffold** — semua halaman masih berupa placeholder. Ini sesuai ekspektasi karena fokus development saat ini ada di backend API.

**Verdict: Backend API sudah cukup matang untuk dilanjutkan ke frontend integration.** Beberapa perbaikan security dan data integrity perlu dikerjakan secara paralel.

---

## II. Code Review

### 2.1 Hal yang Sudah Baik ✅

| Aspek | Keterangan |
|:---|:---|
| **Layered Architecture** | Konsisten diterapkan: Router → Controller → Service → Prisma. Tidak ada query database di controller, tidak ada response handling di service. |
| **Error Handling** | `ResponseError` class + centralized `errorMiddleware` sudah benar. Semua controller menggunakan pola `try/catch` → `next(e)`. |
| **Validasi Zod** | Setiap domain memiliki validation schema sendiri. Pesan error dalam Bahasa Indonesia konsisten. |
| **Snapshot Pattern (OrderItem)** | Menyimpan `productName`, `flavorName`, `sizeName`, `price` di OrderItem — data historis terlindungi dari perubahan master data. |
| **Data Isolation** | Setiap query data customer menyertakan `userId` di klausa `where`. Ini mencegah IDOR (Insecure Direct Object Reference). |
| **Upsert Pattern (Cart & Payment)** | Cart menggunakan `upsert` untuk menghindari duplikat. Payment juga menggunakan `upsert` yang memungkinkan re-upload setelah reject. |
| **Transaction Usage** | `$transaction` digunakan dengan benar di order creation, product deletion, dan payment verification. |
| **Test Coverage** | 9 test file mencakup semua tahapan API (user, product, cart, order, payment, admin). Test utility (`test-util.js`) memudahkan setup/teardown. |
| **Dokumentasi Kode** | JSDoc dan komentar Bahasa Indonesia sudah cukup lengkap di setiap function dan section. |
| **Paginasi** | Sudah menggunakan `Promise.all` / `$transaction` untuk query data + count secara paralel sesuai konvensi CONTEXT.md. |

### 2.2 Temuan dan Rekomendasi

#### 🔴 CRITICAL

**C-01: `parseInt()` tanpa radix dan tanpa validasi NaN di Controller**

**File terdampak:**
- `controller/order-controller.js:36` — `parseInt(req.params.id)`
- `controller/user-controller.js:89, 100` — `parseInt(req.params.id)`
- `controller/cart-controller.js:50, 69` — `parseInt(req.params.id)`

`parseInt()` tanpa parameter radix bisa memproduksi hasil tak terduga (misal `parseInt("08")` pada engine lama). Lebih parah, jika `req.params.id = "abc"`, maka `parseInt("abc")` menghasilkan `NaN` yang diteruskan ke service tanpa pengecekan.

```javascript
// ❌ Saat ini
const orderId = parseInt(req.params.id);

// ✅ Rekomendasi
const orderId = parseInt(req.params.id, 10);
if (isNaN(orderId)) {
  return next(new ResponseError(400, "ID tidak valid."));
}
```

> **Catatan:** Di `admin-order-service.js`, validasi `isNaN` sudah ada di service layer. Tapi sebaiknya tetap divalidasi di controller juga untuk fail-fast, sesuai prinsip defense in depth.

---

**C-02: Race Condition pada Order Number Generation**

**File:** `services/order-service.js:89-97`

```javascript
const orderCountToday = await tx.order.count({
  where: { orderNumber: { startsWith: `UTQ-${dateStr}` } },
});
const serial = (orderCountToday + 1).toString().padStart(3, "0");
```

Walaupun sudah di dalam `$transaction`, Prisma interactive transaction tidak otomatis melakukan row-level locking. Jika dua user checkout bersamaan dalam milidetik yang sama, keduanya bisa mendapatkan `count` yang sama dan menghasilkan nomor order duplikat. Karena `orderNumber` adalah `@unique`, salah satu transaksi akan gagal (Prisma unique constraint violation error), bukan `ResponseError` yang terkontrol.

**Rekomendasi:**
- Gunakan `$queryRaw` dengan `SELECT ... FOR UPDATE` atau
- Gunakan sequence database (PostgreSQL `SERIAL` / `nextval`)
- Atau tambahkan retry loop dengan catching unique constraint error

---

**C-03: Hapus Produk Tidak Memeriksa Relasi ke OrderItem/CartItem**

**File:** `services/product-admin-service.js:105-129`

```javascript
await prisma.$transaction([
  prisma.productVariant.deleteMany({ where: { productId: id } }),
  prisma.product.delete({ where: { id } }),
]);
```

Jika ada `CartItem` atau `OrderItem` yang mereferensikan `ProductVariant` dari produk ini, delete akan gagal dengan **foreign key constraint error** dari database, menghasilkan error 500 yang tidak user-friendly.

**Rekomendasi:**
- Cek apakah ada CartItem/OrderItem yang masih mereferensikan varian produk tersebut sebelum menghapus.
- Jika ada, tampilkan pesan error yang jelas: *"Produk tidak bisa dihapus karena masih ada dalam pesanan aktif."*
- Atau gunakan **soft delete** (`isAvailable = false`) sebagai gantinya.

---

**C-04: Hapus Varian Tidak Memeriksa Relasi ke OrderItem/CartItem**

**File:** `services/product-admin-service.js:222-240`

Sama seperti C-03, `removeVariant` langsung menghapus tanpa memeriksa apakah varian masih digunakan di `CartItem` atau `OrderItem`.

---

#### 🟡 MEDIUM

**M-01: Inkonsistensi Response Format `getAllOrders` di Admin**

**File:** `controller/admin-order-controller.js:14`

```javascript
res.status(200).json(result); // ← Langsung result
```

Semua endpoint lain menggunakan format `{ data: ... }`, tapi `getAllOrders` mengembalikan `{ data: [...], paging: {...} }` langsung tanpa wrapper. Ini sudah benar menurut konvensi CONTEXT.md untuk format List, tapi perlu diperhatikan bahwa response di service sudah mem-format `data` dan `paging`, jadi controller harus **tidak** menambahkan wrapper `{ data: ... }` lagi. Saat ini ini sudah benar, hanya perlu memastikan frontend konsisten memahami pola ini.

---

**M-02: `order-service.js` — List Order Tanpa Paginasi**

**File:** `services/order-service.js:167-175`

```javascript
const list = async (userId) => {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
};
```

List order customer tidak menggunakan paginasi. Untuk user dengan banyak pesanan, ini bisa menjadi performance issue. Menurut konvensi di CONTEXT.md (Section 4 — Response Format — List), endpoint list harus menggunakan paginasi.

**Rekomendasi:** Tambahkan parameter `page` dan `size` sesuai pola `admin-order-service.js`.

---

**M-03: Validasi `updateAddress` Tidak Ada Pengecekan `where` untuk `userId`**

**File:** `services/user-service.js:272-275`

```javascript
return prisma.address.update({
  where: { id: addressId },
  data: updateRequest,
});
```

Setelah pengecekan ownership via `count`, update dilakukan hanya berdasarkan `id`. Ini sebenarnya sudah aman karena ada pengecekan `count` sebelumnya, tapi ada jeda waktu (TOCTOU — time of check to time of use). Idealnya, gunakan compound `where` di Prisma:

```javascript
return prisma.address.update({
  where: { id: addressId, userId: userId },
  data: updateRequest,
});
```

---

**M-04: Cart Store Frontend Mengakses Struktur Data yang Tidak Sesuai Backend**

**File:** `frontend/src/stores/use-cart-store.js:19`

```javascript
set({ items: response.data.data.items || [], isLoading: false });
```

Backend cart service mengembalikan array langsung (`response.data.data` sudah merupakan array), bukan objek dengan property `items`. Ini akan menyebabkan `items` selalu menjadi `[]` karena `response.data.data.items` akan `undefined`.

Lalu di line 33:
```javascript
(sum, item) => sum + item.quantity * item.productVariant.price,
```

Tapi backend mengembalikan field `price` di root level item, bukan `item.productVariant.price`.

**Rekomendasi:** Sesuaikan store dengan response shape dari backend.

---

**M-05: Tidak Ada Validasi `NaN` di `Number()` pada Controller**

**File terdampak:**
- `controller/payment-controller.js:17` — `Number(req.params.orderId)`
- `controller/product-admin-controller.js:33, 51, 69, 87, 105` — `Number(req.params.id)`
- `controller/payment-admin-controller.js:16, 35` — `Number(req.params.id)`

`Number("abc")` menghasilkan `NaN`. Di beberapa service (`admin-order-service.js`) ada pengecekan `isNaN`, tapi di service lain (product-admin, payment-admin, payment) pengecekan ini tidak ada — `NaN` langsung dikirim ke Prisma, menghasilkan error Prisma yang kurang informatif.

---

**M-06: Tidak Ada `max` Limit pada `size` Parameter di `searchProductValidation`**

**File:** `validation/product-public-validation.js:11`

```javascript
size: z.coerce.number().int().min(1, "...").default(10),
```

Tidak ada batasan maksimal untuk `size`. User bisa mengirim `?size=999999` yang akan memuat seluruh tabel produk sekaligus, berpotensi menyebabkan performance issue.

**Rekomendasi:** Tambahkan `.max(100, "Ukuran halaman maksimal 100.")` seperti di `admin-order-validation.js`.

---

**M-07: Checkout Order Tidak Mengembalikan `orderNumber` dalam Response**

**File:** `services/order-service.js:138-142`

```javascript
include: {
  items: true,
  address: true,
},
```

Response setelah create order menyertakan `items` dan `address`, tapi `orderNumber` sudah otomatis tersedia karena merupakan field model. Ini sebenarnya sudah benar. ✅ (Non-issue setelah verifikasi)

---

**M-08: `.env` File Masuk ke Repository**

Meskipun `.gitignore` sudah mencantumkan `.env`, file `.env` di `backend/` masih berisi kredensial database lokal (`postgres:12345`). Pastikan file ini **tidak** pernah ter-commit ke Git. Verifikasi dengan `git status` atau `git ls-files`.

---

#### 🟢 MINOR / IMPROVEMENT

**I-01: `AdminLayout` Hanya Cek `user.role !== "ADMIN"` tapi Tidak Handle `user === null`**

**File:** `frontend/src/layouts/AdminLayout.jsx:13`

```javascript
if (user && user.role !== "ADMIN") {
  return <Navigate to="/" replace />;
}
```

Jika `user` masih `null` (belum login atau masih loading), layout akan tetap di-render. Seharusnya ada penanganan untuk redirect ke `/login` jika `user` adalah `null` dan token sudah expired/tidak ada.

---

**I-02: Layout Menggunakan `<a href>` bukan `<Link>` dari React Router**

**File:** `frontend/src/layouts/MainLayout.jsx` dan `AdminLayout.jsx`

Menggunakan `<a href>` menyebabkan full page reload, mengalahkan tujuan SPA. Gunakan `<Link to="...">` atau `<NavLink>` dari `react-router-dom`.

---

**I-03: `frontend/src/components/.gitkeep.js` dan `frontend/src/hooks/.gitkeep.js`**

File `.gitkeep` seharusnya berekstensi kosong (tanpa `.js`). Ini bisa menimbulkan kebingungan karena diimpor sebagai JavaScript file.

---

**I-04: `CORS_ORIGIN` Hanya Mendukung Satu Origin**

**File:** `application/web.js:22`

```javascript
origin: process.env.CORS_ORIGIN || "http://localhost:5173",
```

Untuk production, mungkin perlu mendukung multiple origins (misalnya staging + production domain). Pertimbangkan menggunakan array atau regex.

---

**I-05: `web.js` Tidak Memiliki `trust proxy` Setting**

Jika di-deploy di belakang reverse proxy (Railway, Render, Vercel), `express-rate-limit` akan menghitung semua request sebagai berasal dari satu IP (proxy). Tambahkan:

```javascript
web.set("trust proxy", 1);
```

---

**I-06: Konvensi Nama File Tidak Konsisten**

CONTEXT.md menyebutkan konvensi `kebab-case.js` untuk file/folder backend, tapi ada file test dengan nama `master-admin.test.js`, `product-admin.test.js` (ini sudah benar). Namun, `prisma.config.ts` menggunakan TypeScript di proyek JavaScript — ini wajar untuk Prisma 7 tapi perlu dicatat.

---

**I-07: `removeTestUser` Menghapus Semua User**

**File:** `tests/test-util.js:5`

```javascript
await prisma.user.deleteMany({});
```

`deleteMany` tanpa filter menghapus **semua** user, termasuk data yang mungkin bukan test data. Untuk testing di database terpisah ini aman, tapi berisiko jika dev database dipakai bersama.

---

**I-08: Tidak Ada Logger/Logging Library**

Backend hanya menggunakan `console.error` di `error-middleware.js`. Untuk production, pertimbangkan menggunakan logging library seperti `pino` atau `winston` dengan structured logging untuk memudahkan debugging.

---

## III. Desain Arsitektur Review

### 3.1 Hal yang Sudah Baik ✅

| Aspek | Keterangan |
|:---|:---|
| **Monorepo Structure** | `backend/` dan `frontend/` dalam satu repo memudahkan development dan deployment coordination. |
| **Router Separation** | Tiga router (`publicRouter`, `apiRouter`, `adminRouter`) dengan middleware auth yang tepat — sangat jelas dan mudah diaudit. |
| **Prisma Schema Design** | Menggunakan `@@map` untuk naming database columns (snake_case) sementara model Prisma menggunakan camelCase — best practice. |
| **Snapshot Pattern** | OrderItem menyimpan snapshot harga dan nama produk — kritis untuk e-commerce. |
| **Production Queue** | Desain antrian produksi dengan kapasitas 10 order/hari dan auto-shift ke hari berikutnya — sesuai kebutuhan bisnis. |
| **Payment Model** | Satu payment per order (`@unique orderId`), mendukung re-upload setelah reject — flow bisnis yang tepat. |

### 3.2 Temuan Arsitektur

#### 🔴 CRITICAL

**A-01: Auto-Cancel Cron Job Belum Diimplementasi**

CONTEXT.md Section 8 Poin 7 menyebutkan:
> *"Auto-Cancel Payment: Scheduled job (cron) memeriksa order `PENDING_PAYMENT` yang melewati `payment_deadline` dan otomatis mengubah statusnya menjadi `CANCELLED`."*

CONTEXT.md Section 3 juga menyebutkan folder `src/jobs/` untuk scheduled jobs. Namun:
- Folder `src/jobs/` **tidak ada**.
- Tidak ada implementasi cron job sama sekali.
- Tidak ada dependency `node-cron` atau `node-schedule` di `package.json`.

Tanpa fitur ini, order `PENDING_PAYMENT` yang melewati deadline akan **tetap terbuka selamanya**, mengacaukan production queue.

**Rekomendasi:** Implementasi auto-cancel job dengan prioritas tinggi.

---

**A-02: Autentikasi Berbasis UUID Token Tanpa Expiration**

**File:** `services/user-service.js:78`, `middleware/auth-middleware.js`

Sistem autentikasi saat ini:
1. Login → Generate UUID → Simpan di kolom `token` di tabel `User`
2. Setiap request → Query database: `findFirst({ where: { token } })`

**Masalah:**
- **Token tidak pernah expire** — Sekali login, token valid selamanya (sampai logout manual)
- **Database hit per request** — Setiap API call authenticated memerlukan 1 query database tambahan
- **Satu user = satu session** — Login di device baru menimpa token lama, otomatis logout device sebelumnya (bisa jadi fitur atau bug tergantung requirement)

**Rekomendasi untuk jangka pendek (tanpa mengubah arsitektur):**
- Tambahkan kolom `tokenExpiredAt` di tabel `User`
- Set expiration saat login (misal 7 hari)
- Cek expiration di `authMiddleware`

**Rekomendasi untuk jangka panjang:**
- Migrasi ke JWT (access token + refresh token)
- Gunakan `httpOnly` cookie untuk refresh token

---

#### 🟡 MEDIUM

**A-03: `user-service.js` Menangani Terlalu Banyak Domain**

File `user-service.js` menangani logic User DAN Address (createAddress, listAddresses, updateAddress, deleteAddress). Ini melanggar Single Responsibility Principle.

**Rekomendasi:** Pisahkan ke `address-service.js` dan `address-controller.js`.

---

**A-04: Tidak Ada Soft Delete**

Semua operasi delete menggunakan hard delete (`prisma.delete` / `prisma.deleteMany`). Untuk e-commerce, data produk dan varian sebaiknya tidak benar-benar dihapus karena:
- Ada `OrderItem` yang mereferensikan `ProductVariant` (meskipun sudah snapshot, FK masih ada)
- Data historis penting untuk audit trail

**Rekomendasi:** Gunakan soft delete dengan field `deletedAt` atau manfaatkan field `isAvailable = false` yang sudah ada.

---

**A-05: Tidak Ada Mekanisme Email Notification**

`nodemailer` sudah ada di dependencies dan `.env.example` sudah memiliki konfigurasi SMTP, tapi tidak ada kode yang menggunakan nodemailer. Email notifikasi (konfirmasi order, pembayaran diterima, perubahan status, dsb.) belum diimplementasi.

---

**A-06: Frontend Masih Skeleton**

Semua 16 halaman frontend (auth, customer, admin) masih berupa placeholder. Ini bukan masalah jika focus development ada di backend, tapi perlu direncanakan timeline implementasi frontend.

---

**A-07: Tidak Ada `onDelete` Cascade di Prisma Schema**

Prisma schema tidak mendefinisikan `onDelete` behavior pada relasi. Ini berarti default behavior Prisma/PostgreSQL akan berlaku (biasanya `RESTRICT` atau `NO ACTION`), yang bisa menyebabkan error saat menghapus parent record.

Contoh masalah:
- Hapus User → gagal karena ada Address, Order, Review, Cart
- Hapus Product → gagal karena ada ProductVariant, Review
- Hapus Order → gagal karena ada OrderItem, Payment, ProductionQueue

**Rekomendasi:** Definisikan `onDelete: Cascade` atau `onDelete: Restrict` secara eksplisit pada setiap relasi di schema Prisma.

---

**A-08: Tidak Ada Index Database Selain Unique**

Prisma schema hanya mendefinisikan index via `@unique` dan `@@unique`. Tidak ada index tambahan untuk query yang sering dilakukan:

| Query | Field yang Perlu Index |
|:---|:---|
| Auth middleware (setiap request) | `users.token` |
| Order list by user | `orders.user_id` |
| Order filter by status | `orders.status` |
| Production queue by date | `production_queue.production_date` |
| Product search by name | `products.name` (untuk `contains`) |

**Rekomendasi:** Tambahkan `@@index` di schema Prisma untuk field-field di atas.

---

## IV. Requirement Review

### 4.1 Status Progress API

| Tahap | Total | Selesai | Belum | Status |
|:---|:---:|:---:|:---:|:---|
| 1 — Auth & User | 5 | 5 | 0 | ✅ Complete |
| 2 — Master Data Admin | 10 | 10 | 0 | ✅ Complete |
| 3 — Produk Public | 2 | 2 | 0 | ✅ Complete |
| 4 — Alamat | 4 | 4 | 0 | ✅ Complete |
| 5 — Cart | 4 | 4 | 0 | ✅ Complete |
| 6 — Order | 3 | 3 | 0 | ✅ Complete |
| 7 — Payment | 3 | 3 | 0 | ✅ Complete |
| 8 — Admin Order | 5 | 5 | 0 | ✅ Complete |
| 9 — Review | 1 | 0 | 1 | ❌ Belum |
| 10 — Dashboard | 2 | 0 | 2 | ❌ Belum |
| **Total** | **39** | **36** | **3** | **92% selesai** |

### 4.2 Gap Analysis — Fitur vs Implementasi

#### Fitur yang Ada di CONTEXT.md Tapi Belum Ada di Kode:

| # | Fitur | Status | Keterangan |
|:---|:---|:---|:---|
| R-01 | Auto-Cancel Payment (Cron) | ❌ Belum | Kritis — order expired tidak dibersihkan |
| R-02 | Review & Rating API | ❌ Belum | Fase 2, sudah ada di schema Prisma |
| R-03 | Dashboard API | ❌ Belum | Fase 2 |
| R-04 | Statistics API | ❌ Belum | Fase 2 |
| R-05 | Email Notification | ❌ Belum | Nodemailer ada di deps tapi belum dipakai |
| R-06 | Tracking URL Generation | ⚠️ Parsial | Field `trackingUrl` ada di schema tapi belum auto-generate |
| R-07 | Flat Rate Shipping | ⚠️ Parsial | Hardcode `shippingCost: 0` di order service |
| R-08 | Ongkir per Zona | ❌ Belum | Direncanakan fase lanjutan |
| R-09 | Frontend Implementation | ❌ Skeleton | Semua 16 page masih placeholder |

#### Fitur yang Sudah Diimplementasi Sesuai Requirement:

| # | Fitur | Status |
|:---|:---|:---|
| ✅ | Production Queue (Maks 10/hari + auto-shift) | Sesuai requirement |
| ✅ | Snapshot Pattern di OrderItem | Sesuai requirement |
| ✅ | Payment Deadline (24 jam) | Sesuai requirement |
| ✅ | Payment Re-upload setelah Reject | Sesuai requirement |
| ✅ | Status Transition Validation | Sesuai requirement |
| ✅ | Slug-based Product URL | Sesuai requirement |
| ✅ | Role-based Access (Customer/Admin) | Sesuai requirement |
| ✅ | Data Isolation per User | Sesuai requirement |

### 4.3 Temuan Requirement

**R-10: Shipping Cost Hardcode 0**

**File:** `services/order-service.js:129`

```javascript
shippingCost: 0, // Flat rate 0 (tahap awal)
```

CONTEXT.md menyebutkan *"Flat Rate Shipping: Ongkir menggunakan flat rate per zona untuk tahap awal"*. Tapi saat ini ongkir adalah 0 (gratis), bukan flat rate. Perlu didefinisikan berapa flat rate yang dimaksud, atau minimal buat konfigurasi environment variable.

---

**R-11: `PAYMENT_DEADLINE_HOURS` di `.env` Tidak Digunakan**

`.env.example` mendefinisikan `PAYMENT_DEADLINE_HOURS=24`, tapi di `order-service.js:83`:

```javascript
const paymentDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
```

Nilai 24 jam di-hardcode, tidak membaca dari environment variable. Ini membuat konfigurasi `.env` menjadi menyesatkan.

---

**R-12: Tidak Ada Update/Delete untuk Master Data Flavor & Size**

Admin hanya bisa CREATE dan LIST untuk Flavor dan Size. Tidak ada endpoint PATCH/DELETE. Ini mungkin by design, tapi sebaiknya didokumentasikan secara eksplisit di CONTEXT.md bahwa Flavor dan Size tidak bisa diedit/dihapus setelah dibuat.

---

## V. Security Review

### 5.1 Hal yang Sudah Baik ✅

| Aspek | Keterangan |
|:---|:---|
| **Helmet** | HTTP security headers diterapkan via helmet. |
| **CORS** | Dikonfigurasi dengan origin yang spesifik, bukan wildcard `*`. |
| **Rate Limiting** | `express-rate-limit` aktif (100 req/15 min per IP). |
| **Password Hashing** | bcrypt dengan salt rounds 10 — standar industri. |
| **Router Separation** | Public, customer, admin memiliki middleware chain yang jelas. |
| **File Upload Validation** | Mime type check + file size limit (2MB) di multer. |
| **Data Isolation** | Query selalu menyertakan `userId` untuk customer data. |

### 5.2 Temuan Security

#### 🔴 CRITICAL

**S-01: Token Storage Tidak Aman**

Saat ini, token disimpan di `localStorage` pada frontend. Ini rentan terhadap **XSS (Cross-Site Scripting)** — jika ada satu vulnerability XSS di frontend, attacker bisa membaca `localStorage.getItem("token")` dan mencuri session user.

**Rekomendasi:** Gunakan `httpOnly` cookie untuk menyimpan token (tidak bisa diakses via JavaScript).

---

**S-02: Tidak Ada Token Expiration**

Seperti disebutkan di A-02, token UUID tidak pernah expire. Jika token bocor (via XSS, shared computer, log file, dsb.), attacker memiliki akses permanen ke akun user.

---

**S-03: Login Tidak Memiliki Rate Limiting Terpisah**

Rate limit global 100 req/15 min berlaku untuk semua endpoint. Endpoint login seharusnya memiliki rate limit yang lebih ketat (misal 5 req/15 min per IP) untuk mencegah brute force attack.

**Rekomendasi:**
```javascript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { error: "Terlalu banyak percobaan login. Coba lagi nanti." },
});
publicRouter.post("/api/users/login", loginLimiter, userController.login);
```

---

**S-04: Tidak Ada Sanitasi Input untuk SQL Injection / NoSQL Injection**

Meskipun Prisma ORM secara default melindungi dari SQL injection via parameterized query, beberapa input string langsung masuk ke filter Prisma tanpa sanitasi (misalnya `contains` filter di product search). Ini aman untuk Prisma, tapi perlu diperhatikan jika nanti ada raw query.

---

#### 🟡 MEDIUM

**S-05: Cloudinary Credentials di Client-Side**

Pastikan Cloudinary credentials hanya diakses di backend (sudah benar saat ini — upload melalui multer middleware di server). Namun, tidak ada environment variable untuk Cloudinary di frontend, yang berarti tidak ada risiko client-side exposure. ✅

---

**S-06: Error Message Terlalu Informatif di Authentication**

**File:** `middleware/auth-middleware.js:14, 20, 35`

```javascript
{ error: "Akses ditolak. Token tidak ditemukan." }
{ error: "Akses ditolak. Token tidak valid." }
{ error: "Akses ditolak. Token tidak valid atau sudah expired." }
```

Tiga pesan error berbeda memungkinkan attacker membedakan antara *"tidak ada token"*, *"format token salah"*, dan *"token expired"*. Idealnya semua menggunakan satu pesan yang sama untuk menyulitkan enumeration.

**Rekomendasi:** Gunakan pesan generic: `"Akses ditolak."` untuk semua kasus 401.

---

**S-07: Password Policy Terlalu Lemah**

**File:** `validation/user-validation.js:19-22`

```javascript
password: z.string().min(6, "Password minimal 6 karakter.")
```

Minimum 6 karakter tanpa requirement untuk uppercase, lowercase, angka, atau special character. Ini terlalu lemah untuk production e-commerce yang menyimpan data pelanggan.

**Rekomendasi:** Minimum 8 karakter dengan setidaknya 1 huruf besar, 1 angka, dan 1 special character. Atau gunakan library seperti `zxcvbn` untuk password strength estimation.

---

**S-08: Registration Endpoint Tidak Memiliki Rate Limit Terpisah**

Mirip S-03, endpoint registrasi bisa dieksploitasi untuk mass account creation (spam). Tambahkan rate limit yang lebih ketat + pertimbangkan CAPTCHA untuk production.

---

**S-09: Tidak Ada Validasi Order Ownership di Payment Upload**

**File:** `services/payment-service.js:23-28`

Validasi sudah ada — `findFirst({ where: { id: orderId, userId: userId } })` — ini sudah benar. ✅

---

**S-10: Admin Routes Tidak Memiliki Audit Logging**

Tindakan admin (verify payment, reject payment, update order status, hapus produk) tidak dicatat di log atau tabel audit. Untuk compliance dan dispute resolution, ini penting.

**Rekomendasi:** Tambahkan tabel `AuditLog` atau minimal logging terstruktur untuk setiap aksi admin.

---

**S-11: Tidak Ada CSRF Protection**

Karena menggunakan `Authorization: Bearer` header (bukan cookie), CSRF attack tidak relevan untuk saat ini. Tapi jika nanti migrasi ke cookie-based auth (sesuai rekomendasi S-01), **CSRF protection wajib ditambahkan**.

---

## VI. Rangkuman Prioritas Temuan

### 🔴 Prioritas Tinggi — Harus Diselesaikan Sebelum Production

| ID | Kategori | Temuan | Effort |
|:---|:---|:---|:---|
| A-01 | Arsitektur | Auto-cancel cron job belum diimplementasi | Medium |
| A-02 | Arsitektur | Token tidak punya expiration | Medium |
| C-01 | Code | `parseInt` tanpa radix + tanpa validasi NaN | Kecil |
| C-02 | Code | Race condition pada order number generation | Medium |
| C-03 | Code | Hapus produk gagal karena FK constraint | Kecil |
| C-04 | Code | Hapus varian gagal karena FK constraint | Kecil |
| S-01 | Security | Token di localStorage rentan XSS | Medium |
| S-03 | Security | Login tanpa rate limit terpisah | Kecil |

### 🟡 Prioritas Sedang — Harus Diselesaikan Dalam Sprint Berikutnya

| ID | Kategori | Temuan | Effort |
|:---|:---|:---|:---|
| M-02 | Code | List order customer tanpa paginasi | Kecil |
| M-04 | Code | Cart store frontend tidak cocok dengan backend response | Kecil |
| M-05 | Code | `Number()` tanpa validasi NaN | Kecil |
| M-06 | Code | Tidak ada max limit `size` di search product | Kecil |
| A-07 | Arsitektur | Tidak ada `onDelete` cascade/restrict di schema | Medium |
| A-08 | Arsitektur | Tidak ada database index | Kecil |
| S-06 | Security | Error message terlalu informatif di auth | Kecil |
| S-07 | Security | Password policy terlalu lemah | Kecil |
| R-10 | Requirement | Shipping cost hardcode 0 | Kecil |
| R-11 | Requirement | `PAYMENT_DEADLINE_HOURS` env var tidak digunakan | Kecil |

### 🟢 Prioritas Rendah — Nice to Have / Improvement

| ID | Kategori | Temuan | Effort |
|:---|:---|:---|:---|
| A-03 | Arsitektur | User service menangani domain Address | Medium |
| A-04 | Arsitektur | Tidak ada soft delete | Medium |
| A-05 | Arsitektur | Email notification belum diimplementasi | Medium |
| I-01 | Code | AdminLayout tidak handle `user === null` | Kecil |
| I-02 | Code | Layout menggunakan `<a href>` bukan `<Link>` | Kecil |
| I-04 | Code | CORS hanya mendukung satu origin | Kecil |
| I-05 | Code | Tidak ada `trust proxy` setting | Kecil |
| I-08 | Code | Tidak ada logging library | Medium |
| S-10 | Security | Tidak ada audit logging untuk admin | Medium |

---

## VII. Prompt untuk AI Coding Agent

Berikut adalah prompt yang dapat diberikan kepada AI coding agent berdasarkan temuan review di atas. Urutkan eksekusi berdasarkan prioritas.

### Prompt 1 — Fix Kritis: Validasi Parameter & Race Condition

```
Berdasarkan review code, perbaiki masalah berikut:

1. Di semua file Controller yang menggunakan `parseInt()` atau `Number()` untuk parsing `req.params`, tambahkan validasi NaN dengan pattern:
   ```javascript
   const id = parseInt(req.params.id, 10);
   if (isNaN(id)) {
     return next(new ResponseError(400, "ID tidak valid."));
   }
   ```
   File: cart-controller.js, order-controller.js, user-controller.js, product-admin-controller.js, payment-controller.js, payment-admin-controller.js

2. Di `order-service.js`, ubah mekanisme order number generation agar menangani race condition:
   - Tambahkan retry loop (max 3 attempts) yang catch Prisma unique constraint error
   - Jika retry gagal, throw ResponseError 500

3. Di `product-admin-service.js`:
   - Pada fungsi `remove`, sebelum menghapus produk, cek apakah ada CartItem atau OrderItem yang mereferensikan varian produk ini. Jika ada, throw ResponseError 400 dengan pesan "Produk tidak bisa dihapus karena masih terdapat dalam pesanan atau keranjang aktif."
   - Terapkan hal yang sama untuk `removeVariant`.

Ikuti semua konvensi di CONTEXT.md. Tambahkan dokumentasi bahasa Indonesia.
Jalankan test yang relevan setelah selesai.
```

### Prompt 2 — Implementasi Auto-Cancel Cron Job

```
Implementasikan fitur Auto-Cancel Order yang disebutkan di CONTEXT.md Section 8 Poin 7:

1. Buat folder `src/jobs/` dengan file `auto-cancel-job.js`
2. Install dependency `node-cron` (atau gunakan `setInterval` native)
3. Buat scheduled job yang berjalan setiap 5 menit:
   - Query semua order dengan status `PENDING_PAYMENT` di mana `paymentDeadline < now()`
   - Update status masing-masing menjadi `CANCELLED` dengan `cancelReason: "Batas waktu pembayaran habis (otomatis)"`
   - Hapus entri terkait di `ProductionQueue` jika ada
   - Log jumlah order yang di-cancel
4. Import dan jalankan job di `src/index.js`
5. Tambahkan unit test di `tests/auto-cancel.test.js`

Gunakan `PAYMENT_DEADLINE_HOURS` dari `.env` untuk menentukan deadline (saat ini hardcode 24 jam di order-service.js — ubah juga agar membaca dari env).

Ikuti semua konvensi di CONTEXT.md.
Update CONTEXT.md untuk menandai fitur ini sebagai selesai.
```

### Prompt 3 — Fix Security: Token Expiration & Rate Limit Login

```
Perbaiki masalah security berikut:

1. Tambahkan token expiration:
   - Tambahkan field `tokenExpiredAt DateTime?` di model User pada schema Prisma
   - Di `user-service.js` login function, set `tokenExpiredAt` ke 7 hari dari sekarang
   - Di `auth-middleware.js`, cek apakah `tokenExpiredAt < now()`. Jika ya, hapus token dan return 401
   - Jalankan `npx prisma db push` setelah update schema

2. Tambahkan rate limit terpisah untuk endpoint login:
   - Buat loginLimiter di `web.js` atau langsung di `public-api.js`: max 5 request per 15 menit per IP
   - Terapkan ke `POST /api/users/login`

3. Ubah pesan error di `auth-middleware.js` menjadi satu pesan generic "Akses ditolak." untuk semua kasus 401.

4. Di `validation/user-validation.js`, ubah password minimum dari 6 menjadi 8 karakter.

5. Di `product-public-validation.js`, tambahkan `.max(100)` untuk parameter `size`.

Ikuti semua konvensi di CONTEXT.md.
Buat/update unit test yang relevan.
```

### Prompt 4 — Paginasi dan Konsistensi Response

```
Perbaiki masalah paginasi dan konsistensi:

1. Di `order-service.js`, tambahkan paginasi pada fungsi `list`:
   - Buat validation schema baru `listOrderValidation` di `order-validation.js`
   - Terima parameter page (default 1) dan size (default 10, max 100)
   - Gunakan `Promise.all` atau `$transaction` untuk query data + count
   - Return format: `{ data: [...], paging: { page, total_item, total_page } }`
   - Update controller dan route sesuai

2. Di `order-service.js` fungsi `create`, ganti hardcode 24 jam menjadi membaca `PAYMENT_DEADLINE_HOURS` dari environment:
   ```javascript
   const deadlineHours = parseInt(process.env.PAYMENT_DEADLINE_HOURS || "24", 10);
   const paymentDeadline = new Date(now.getTime() + deadlineHours * 60 * 60 * 1000);
   ```

3. Update `manual-test-api.md` untuk endpoint list order customer agar mencantumkan query params paginasi.

Ikuti semua konvensi di CONTEXT.md.
```

### Prompt 5 — Database Index & Schema Improvement

```
Perbaiki schema Prisma:

1. Tambahkan database index untuk optimasi query:
   - `@@index([token])` pada model User (digunakan setiap request oleh auth middleware)
   - `@@index([userId])` pada model Order
   - `@@index([status])` pada model Order
   - `@@index([productionDate])` pada model ProductionQueue
   - `@@index([userId])` pada model Address

2. Tambahkan `onDelete` behavior pada relasi:
   - Address → Order: `onDelete: Restrict` (alamat tidak bisa dihapus jika masih ada order)
   - User → Address/Order/Review/Cart: `onDelete: Restrict` (user tidak bisa dihapus jika masih ada data terkait)
   - Product → ProductVariant: `onDelete: Cascade` (hapus produk = hapus varian)
   - Order → OrderItem/Payment/ProductionQueue: `onDelete: Cascade`

3. Jalankan `npx prisma db push` setelah update.
4. Jalankan semua test untuk memastikan tidak ada regression.

Ikuti semua konvensi di CONTEXT.md.
Update CONTEXT.md jika ada keputusan arsitektur baru.
```

---

_Dokumen review ini dibuat berdasarkan analisis menyeluruh terhadap seluruh source code proyek Utique per tanggal 3 Juni 2026._

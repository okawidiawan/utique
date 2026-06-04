# Issue: Critical Fixes — Utique Backend

**Prioritas:** 🔴 CRITICAL — Harus diselesaikan sebelum production  
**Dibuat berdasarkan:** Review Senior Developer, 3 Juni 2026  
**Ditujukan untuk:** Junior Developer / AI Coding Assistant

> **Instruksi Umum:**
>
> - Baca `CONTEXT.md` terlebih dahulu sebelum mulai mengerjakan apapun.
> - Ikuti semua konvensi kode yang ada di `CONTEXT.md` (naming, layer architecture, error handling, dll).
> - Setiap perubahan harus disertai dokumentasi komentar Bahasa Indonesia.
> - Jalankan unit test yang relevan setelah setiap perbaikan. Semua test harus lolos.
> - **Jangan commit/push** kecuali diminta secara eksplisit.

---

## ISSUE C-01: `parseInt()` Tanpa Radix dan Tanpa Validasi NaN di Controller

**ID:** C-01  
**Kategori:** Code Bug  
**Effort:** Kecil (~1-2 jam)

### Latar Belakang

Di beberapa controller, parameter dari URL (`req.params.id`) di-parse menggunakan `parseInt()` tanpa argumen radix kedua, dan hasilnya tidak dicek apakah `NaN`. Ini berbahaya karena:

1. `parseInt("abc")` menghasilkan `NaN`, yang kemudian diteruskan ke service/Prisma dan menghasilkan error 500 yang tidak terkontrol (bukan 400).
2. `parseInt()` tanpa radix bisa berperilaku tak terduga pada beberapa engine lama (misalnya `parseInt("08")` bisa menghasilkan 0 karena dianggap oktal).

### File yang Harus Diubah

| File                             | Baris    | Kode Bermasalah           |
| -------------------------------- | -------- | ------------------------- |
| `controller/order-controller.js` | ~36      | `parseInt(req.params.id)` |
| `controller/user-controller.js`  | ~89, 100 | `parseInt(req.params.id)` |
| `controller/cart-controller.js`  | ~50, 69  | `parseInt(req.params.id)` |

### Perubahan yang Harus Dilakukan

Untuk **setiap** penggunaan `parseInt()` atau `Number()` pada `req.params` di semua controller yang disebutkan di atas, ubah menjadi pola berikut:

```javascript
// ❌ SEBELUM (salah)
const orderId = parseInt(req.params.id);

// ✅ SESUDAH (benar)
const orderId = parseInt(req.params.id, 10); // Radix 10 = desimal
if (isNaN(orderId)) {
  return next(new ResponseError(400, "ID tidak valid."));
}
```

### Catatan Penting

- Import `ResponseError` dari `../error/response-error.js` jika belum ada di controller tersebut.
- Pengecekan `isNaN` harus dilakukan **di controller** (bukan hanya di service), sesuai prinsip _defense in depth_ — validasi awal di layer paling luar agar proses gagal lebih cepat (fail-fast).
- Jika ada controller lain di luar daftar di atas yang menggunakan `parseInt()` atau `Number()` pada `req.params`, terapkan pola yang sama.

### Verifikasi

Jalankan test berikut untuk memastikan perubahan tidak merusak fungsionalitas yang ada:

```bash
npx jest tests/order.test.js
npx jest tests/cart.test.js
npx jest tests/user.test.js
```

Tambahkan test case baru di setiap file test untuk memastikan request dengan ID non-numerik (misalnya `"abc"`) mengembalikan HTTP 400.

---

## ISSUE C-02: Race Condition pada Order Number Generation

**ID:** C-02  
**Kategori:** Data Integrity Bug  
**Effort:** Medium (~3-4 jam)

### Latar Belakang

Order number (`orderNumber`) dibuat dengan pola `UTQ-YYYYMMDD-XXX`, di mana `XXX` adalah counter harian yang dihitung dengan `prisma.order.count()`. Kode ini ada di dalam Prisma interactive transaction (`$transaction`), namun **ini tidak cukup** untuk mencegah race condition.

**Mengapa `$transaction` tidak cukup:**
Prisma interactive transaction tidak otomatis melakukan row-level locking (`SELECT FOR UPDATE`). Jika dua user melakukan checkout pada saat yang hampir bersamaan (dalam milidetik yang sama), kedua transaksi bisa mendapatkan hasil `count` yang identik, menghasilkan `orderNumber` yang sama. Karena `orderNumber` adalah field `@unique` di Prisma schema, salah satu transaksi akan gagal dengan **Prisma unique constraint violation error** — bukan `ResponseError` yang terkontrol, sehingga user mendapat error 500.

### File yang Harus Diubah

**File:** `services/order-service.js`  
**Baris sekitar:** 89-97 (bagian generate `orderNumber` di dalam transaksi `create`)

### Kode Bermasalah (Saat Ini)

```javascript
// Hitung jumlah order hari ini untuk membuat serial number
const orderCountToday = await tx.order.count({
  where: { orderNumber: { startsWith: `UTQ-${dateStr}` } },
});
const serial = (orderCountToday + 1).toString().padStart(3, "0");
const orderNumber = `UTQ-${dateStr}-${serial}`;
```

### Perubahan yang Harus Dilakukan

Implementasikan **retry loop** yang menangkap unique constraint violation dari Prisma. Pisahkan logika generate `orderNumber` dan logika insert agar retry bisa dilakukan hanya pada bagian yang bermasalah.

Berikut pendekatan yang direkomendasikan:

**Langkah 1:** Buat helper function untuk generate `orderNumber`:

```javascript
/**
 * Membuat nomor order unik dengan format UTQ-YYYYMMDD-XXX.
 * Menggunakan retry loop untuk menangani kemungkinan race condition
 * di mana dua order dibuat bersamaan pada hari yang sama.
 *
 * @param {Object} tx - Prisma transaction client
 * @param {string} dateStr - String tanggal format YYYYMMDD
 * @param {number} maxRetries - Jumlah maksimal percobaan ulang
 * @returns {Promise<string>} Nomor order yang unik
 */
const generateOrderNumber = async (tx, dateStr, maxRetries = 5) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const orderCountToday = await tx.order.count({
      where: { orderNumber: { startsWith: `UTQ-${dateStr}` } },
    });
    // Tambahkan angka acak kecil pada percobaan ulang untuk mengurangi
    // kemungkinan collision berikutnya
    const offset = attempt > 1 ? Math.floor(Math.random() * 10) : 0;
    const serial = (orderCountToday + 1 + offset).toString().padStart(3, "0");
    const candidate = `UTQ-${dateStr}-${serial}`;

    // Cek apakah nomor ini sudah dipakai (double-check)
    const existing = await tx.order.findUnique({
      where: { orderNumber: candidate },
    });

    if (!existing) {
      return candidate; // Nomor aman, kembalikan
    }
    // Jika sudah ada, lanjut ke percobaan berikutnya
  }
  throw new ResponseError(500, "Gagal membuat nomor order. Coba lagi.");
};
```

**Langkah 2:** Gunakan helper ini di dalam transaksi `create` order:

```javascript
// Di dalam $transaction pada fungsi create:
const orderNumber = await generateOrderNumber(tx, dateStr);
```

**Langkah 3:** Tambahkan try-catch di sekitar pemanggilan `$transaction` untuk menangkap unique constraint error Prisma yang mungkin masih lolos:

```javascript
try {
  const result = await prisma.$transaction(async (tx) => {
    // ... logika create order
  });
  return result;
} catch (error) {
  // Tangkap Prisma unique constraint error (P2002)
  if (error.code === "P2002" && error.meta?.target?.includes("orderNumber")) {
    throw new ResponseError(500, "Terjadi konflik nomor order. Silakan coba lagi.");
  }
  throw error; // Lempar ulang error lain agar ditangkap error middleware
}
```

### Verifikasi

```bash
npx jest tests/order.test.js
```

---

## ISSUE C-03 & C-04: Hapus Produk/Varian Gagal Karena FK Constraint

**ID:** C-03, C-04  
**Kategori:** Data Integrity Bug  
**Effort:** Kecil (~2 jam)

### Latar Belakang

Fungsi `remove` (hapus produk) dan `removeVariant` (hapus varian) di `product-admin-service.js` langsung melakukan delete tanpa memeriksa apakah produk/varian tersebut masih direferensikan oleh `CartItem` atau `OrderItem`.

Jika ada referensi aktif, PostgreSQL akan menolak delete karena **foreign key constraint**, dan Prisma akan melempar error database mentah yang menghasilkan HTTP 500 — bukan pesan error yang ramah pengguna (HTTP 400).

### File yang Harus Diubah

**File:** `services/product-admin-service.js`

- **Fungsi `remove`** (~baris 105-129): Menghapus produk beserta semua variannya.
- **Fungsi `removeVariant`** (~baris 222-240): Menghapus satu varian produk.

### Perubahan untuk Fungsi `remove` (C-03)

Tambahkan pengecekan sebelum menghapus produk:

```javascript
/**
 * Menghapus produk beserta semua variannya dari database.
 * Akan gagal jika produk masih memiliki varian yang tercatat
 * di CartItem atau OrderItem aktif.
 *
 * @param {number} id - ID produk yang akan dihapus
 */
const remove = async (id) => {
  // Ambil semua ID varian dari produk ini
  const variants = await prisma.productVariant.findMany({
    where: { productId: id },
    select: { id: true },
  });
  const variantIds = variants.map((v) => v.id);

  // Cek apakah ada CartItem yang mereferensikan varian dari produk ini
  const cartItemCount = await prisma.cartItem.count({
    where: { variantId: { in: variantIds } },
  });

  // Cek apakah ada OrderItem yang mereferensikan varian dari produk ini
  const orderItemCount = await prisma.orderItem.count({
    where: { variantId: { in: variantIds } },
  });

  if (cartItemCount > 0 || orderItemCount > 0) {
    throw new ResponseError(400, "Produk tidak bisa dihapus karena masih terdapat dalam pesanan atau keranjang aktif.");
  }

  // Aman untuk dihapus — jalankan dalam transaksi
  await prisma.$transaction([prisma.productVariant.deleteMany({ where: { productId: id } }), prisma.product.delete({ where: { id } })]);
};
```

### Perubahan untuk Fungsi `removeVariant` (C-04)

Tambahkan pengecekan serupa sebelum menghapus varian:

```javascript
/**
 * Menghapus satu varian produk dari database.
 * Akan gagal jika varian masih ada di CartItem atau OrderItem.
 *
 * @param {number} variantId - ID varian yang akan dihapus
 */
const removeVariant = async (variantId) => {
  // Cek apakah varian masih ada di keranjang belanja
  const cartItemCount = await prisma.cartItem.count({
    where: { variantId },
  });

  // Cek apakah varian masih ada di pesanan manapun
  const orderItemCount = await prisma.orderItem.count({
    where: { variantId },
  });

  if (cartItemCount > 0 || orderItemCount > 0) {
    throw new ResponseError(400, "Varian tidak bisa dihapus karena masih terdapat dalam pesanan atau keranjang aktif.");
  }

  await prisma.productVariant.delete({ where: { id: variantId } });
};
```

### Verifikasi

```bash
npx jest tests/product-admin.test.js
```

Tambahkan test case baru:

- Test hapus produk yang masih ada di CartItem → ekspektasi HTTP 400.
- Test hapus produk yang masih ada di OrderItem → ekspektasi HTTP 400.
- Test hapus produk yang sudah tidak ada referensi → ekspektasi HTTP 200.
- Ulangi tiga skenario di atas untuk `removeVariant`.

---

## ISSUE A-01: Auto-Cancel Cron Job Belum Diimplementasi

**ID:** A-01  
**Kategori:** Missing Critical Feature  
**Effort:** Medium (~4-6 jam)

### Latar Belakang

`CONTEXT.md` Section 8 Poin 7 mendefinisikan fitur **Auto-Cancel Payment**:

> _"Scheduled job (cron) memeriksa order `PENDING_PAYMENT` yang melewati `payment_deadline` dan otomatis mengubah statusnya menjadi `CANCELLED`."_

Namun saat ini:

- Folder `src/jobs/` **tidak ada**.
- Tidak ada implementasi cron job sama sekali.
- Dependency `node-cron` tidak ada di `package.json`.

**Dampak:** Order yang melewati batas waktu pembayaran akan tetap berstatus `PENDING_PAYMENT` selamanya. Ini mengacaukan `ProductionQueue` dan membuat slot produksi tidak pernah terbebas.

### Langkah-Langkah Implementasi

#### Langkah 1: Install Dependency

```bash
cd backend
npm install node-cron
```

#### Langkah 2: Buat File Job

Buat file baru: `backend/src/jobs/auto-cancel-job.js`

```javascript
import cron from "node-cron";
import { prisma } from "../application/database.js";

/**
 * Job otomatis untuk membatalkan order yang melewati batas waktu pembayaran.
 * Job ini berjalan setiap 5 menit.
 *
 * Alur kerja:
 * 1. Cari semua order berstatus PENDING_PAYMENT dengan paymentDeadline di masa lalu.
 * 2. Untuk setiap order, update status menjadi CANCELLED.
 * 3. Hapus entri ProductionQueue terkait (jika ada).
 * 4. Log jumlah order yang berhasil di-cancel.
 */
const runAutoCancelJob = async () => {
  const now = new Date();

  try {
    // Cari semua order yang sudah melewati deadline dan belum dibatalkan
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: "PENDING_PAYMENT",
        paymentDeadline: { lt: now }, // lt = less than (lebih kecil dari sekarang)
      },
      select: { id: true },
    });

    if (expiredOrders.length === 0) {
      return; // Tidak ada yang perlu dibatalkan
    }

    const expiredOrderIds = expiredOrders.map((o) => o.id);

    // Update semua order expired dalam satu transaksi
    await prisma.$transaction([
      // Hapus entri ProductionQueue terkait jika ada
      prisma.productionQueue.deleteMany({
        where: { orderId: { in: expiredOrderIds } },
      }),
      // Update status order menjadi CANCELLED
      prisma.order.updateMany({
        where: { id: { in: expiredOrderIds } },
        data: {
          status: "CANCELLED",
          cancelReason: "Batas waktu pembayaran habis (otomatis).",
        },
      }),
    ]);

    console.log(`[Auto-Cancel Job] ${expiredOrderIds.length} order dibatalkan karena melewati batas waktu pembayaran.`);
  } catch (error) {
    console.error("[Auto-Cancel Job] Gagal menjalankan job:", error.message);
  }
};

/**
 * Mendaftarkan dan menjalankan scheduled job auto-cancel.
 * Jadwal: setiap 5 menit ("*\/5 * * * *")
 */
const startAutoCancelJob = () => {
  console.log("[Auto-Cancel Job] Job dimulai. Berjalan setiap 5 menit.");

  // Jalankan sekali saat startup untuk membersihkan order yang sudah expired
  runAutoCancelJob();

  // Kemudian jadwalkan setiap 5 menit
  cron.schedule("*/5 * * * *", runAutoCancelJob);
};

export { startAutoCancelJob };
```

#### Langkah 3: Gunakan `PAYMENT_DEADLINE_HOURS` dari Environment

Di `services/order-service.js`, cari baris yang men-hardcode 24 jam:

```javascript
// ❌ SEBELUM
const paymentDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);

// ✅ SESUDAH
const deadlineHours = parseInt(process.env.PAYMENT_DEADLINE_HOURS || "24", 10);
const paymentDeadline = new Date(now.getTime() + deadlineHours * 60 * 60 * 1000);
```

Pastikan `PAYMENT_DEADLINE_HOURS=24` ada di `.env.example` (kemungkinan sudah ada, verifikasi saja).

#### Langkah 4: Daftarkan Job di Entry Point

Di `backend/src/index.js`, import dan panggil `startAutoCancelJob` setelah server berhasil start:

```javascript
import { startAutoCancelJob } from "./jobs/auto-cancel-job.js";

// ... kode server yang sudah ada ...

// Daftarkan background jobs setelah server berjalan
startAutoCancelJob();
```

#### Langkah 5: Buat Unit Test

Buat file baru: `backend/tests/auto-cancel.test.js`

Test yang harus ada:

1. Order dengan status `PENDING_PAYMENT` dan `paymentDeadline` di masa lalu → setelah job dijalankan, status berubah menjadi `CANCELLED`.
2. Order dengan status `PENDING_PAYMENT` dan `paymentDeadline` di masa depan → tidak terpengaruh job.
3. Order dengan status lain (misalnya `PAID`) dan `paymentDeadline` di masa lalu → tidak terpengaruh job.
4. Jika order yang di-cancel memiliki entri `ProductionQueue`, entri tersebut ikut terhapus.

Karena `runAutoCancelJob` adalah async function biasa, kamu bisa mengimpornya langsung dan memanggilnya di test tanpa perlu mock cron scheduler.

### Verifikasi

```bash
npx jest tests/auto-cancel.test.js
npx jest # Jalankan semua test untuk memastikan tidak ada regression
```

### Update CONTEXT.md

Setelah selesai, update `CONTEXT.md` Section 8 Poin 7 untuk menandai bahwa fitur ini sudah diimplementasi. Juga update daftar dependency jika diperlukan.

---

## ISSUE A-02: Token Tidak Punya Expiration

**ID:** A-02  
**Kategori:** Security Architecture  
**Effort:** Medium (~3-4 jam)

### Latar Belakang

Sistem autentikasi saat ini menyimpan token UUID di kolom `token` di tabel `User`. Token ini **tidak pernah expire** — sekali login, token valid selamanya hingga user logout secara manual.

**Risiko:** Jika token bocor (misalnya via XSS, shared computer, atau terekspos di log), attacker memiliki akses permanen ke akun user tanpa batas waktu.

### Perubahan yang Harus Dilakukan

#### Langkah 1: Update Prisma Schema

Di `prisma/schema.prisma`, tambahkan field `tokenExpiredAt` pada model `User`:

```prisma
model User {
  // ... field yang sudah ada ...
  token          String?   @map("token")
  tokenExpiredAt DateTime? @map("token_expired_at") // Field baru
  // ... relasi yang sudah ada ...
}
```

Setelah mengubah schema, jalankan:

```bash
cd backend
npx prisma db push
npx prisma generate
```

#### Langkah 2: Set Expiration Saat Login

Di `services/user-service.js`, fungsi `login`, tambahkan pengisian `tokenExpiredAt` saat menyimpan token:

```javascript
// Hitung tanggal expiration token: 7 hari dari sekarang
const tokenExpiredAt = new Date();
tokenExpiredAt.setDate(tokenExpiredAt.getDate() + 7);

// Simpan token dan expiration ke database
await prisma.user.update({
  where: { id: user.id },
  data: {
    token: token,
    tokenExpiredAt: tokenExpiredAt,
  },
});
```

#### Langkah 3: Validasi Expiration di Auth Middleware

Di `middleware/auth-middleware.js`, setelah menemukan user berdasarkan token, tambahkan pengecekan expiration:

```javascript
// Cek apakah token sudah expired
if (user.tokenExpiredAt && user.tokenExpiredAt < new Date()) {
  // Hapus token yang sudah expired dari database
  await prisma.user.update({
    where: { id: user.id },
    data: { token: null, tokenExpiredAt: null },
  });
  // Kembalikan error 401
  return res.status(401).json({ error: "Akses ditolak." });
}
```

#### Langkah 4: Reset Expiration Saat Logout

Di `services/user-service.js`, fungsi `logout`, pastikan `tokenExpiredAt` juga di-clear:

```javascript
await prisma.user.update({
  where: { id: user.id },
  data: {
    token: null,
    tokenExpiredAt: null, // Clear expiration juga
  },
});
```

### Verifikasi

```bash
npx jest tests/user.test.js
```

Tambahkan test case:

- Login → cek bahwa `tokenExpiredAt` terisi di database (7 hari dari sekarang).
- Request dengan token yang sudah expired (manipulasi `tokenExpiredAt` di database test) → ekspektasi HTTP 401.

---

## ISSUE S-01: Token Disimpan di `localStorage` (Rentan XSS)

**ID:** S-01  
**Kategori:** Security — Frontend  
**Effort:** Medium (~3-4 jam)

### Latar Belakang

Token autentikasi saat ini disimpan di `localStorage` pada frontend. `localStorage` dapat diakses oleh JavaScript mana pun yang berjalan di halaman yang sama. Jika ada celah XSS (Cross-Site Scripting) di frontend, attacker dapat mengeksekusi `localStorage.getItem("token")` dan mencuri session user.

**Rekomendasi jangka pendek (implementasi sekarang):** Pindahkan token ke `sessionStorage` sebagai langkah antara. `sessionStorage` memiliki sifat yang sama dengan `localStorage` dalam hal aksesibilitas JavaScript, tetapi otomatis terhapus saat tab/browser ditutup — mengurangi window of opportunity.

**Rekomendasi jangka panjang:** Migrasi ke `httpOnly` cookie (tidak bisa diakses via JavaScript sama sekali). Ini membutuhkan perubahan arsitektur yang lebih besar di backend (mengirim Set-Cookie header, menambahkan CSRF protection) sehingga tidak perlu dilakukan sekarang.

### Perubahan yang Harus Dilakukan (Jangka Pendek)

#### Langkah 1: Ganti `localStorage` dengan `sessionStorage` di Semua Tempat

Cari semua penggunaan `localStorage` yang berkaitan dengan token di folder `frontend/src/`. Ganti dengan `sessionStorage`.

File yang kemungkinan perlu diubah:

- `frontend/src/stores/` (Zustand store yang menyimpan/membaca token)
- `frontend/src/lib/` (konfigurasi Axios interceptor)
- Semua komponen yang secara langsung mengakses `localStorage.getItem("token")` atau `localStorage.setItem("token", ...)`

Contoh perubahan:

```javascript
// ❌ SEBELUM
localStorage.setItem("token", token);
const token = localStorage.getItem("token");
localStorage.removeItem("token");

// ✅ SESUDAH
sessionStorage.setItem("token", token);
const token = sessionStorage.getItem("token");
sessionStorage.removeItem("token");
```

#### Langkah 2: Dokumentasikan di CONTEXT.md

Tambahkan catatan di CONTEXT.md (Section 8 — Keputusan Arsitektur) bahwa token saat ini menggunakan `sessionStorage` dan migrasi ke `httpOnly` cookie direncanakan untuk fase lanjutan.

### Catatan

Perubahan ini berdampak pada UX: user akan ter-logout otomatis setiap kali menutup browser/tab. Ini adalah trade-off yang dapat diterima untuk keamanan yang lebih baik di tahap awal.

---

## ISSUE S-03: Login Tidak Memiliki Rate Limiting Terpisah

**ID:** S-03  
**Kategori:** Security  
**Effort:** Kecil (~1 jam)

### Latar Belakang

Rate limit global yang ada (100 request per 15 menit per IP) berlaku untuk semua endpoint. Endpoint login harusnya memiliki rate limit yang jauh lebih ketat untuk mencegah **brute force attack** — yaitu percobaan login berulang-ulang dengan password yang berbeda-beda secara otomatis.

### Perubahan yang Harus Dilakukan

#### Lokasi: `application/web.js` atau `routes/public-api.js`

Buat rate limiter khusus untuk login dan daftarkan ke endpoint `POST /api/users/login`:

```javascript
import rateLimit from "express-rate-limit";

/**
 * Rate limiter khusus untuk endpoint login.
 * Lebih ketat dari rate limit global untuk mencegah brute force attack.
 * Maksimal 5 percobaan login per 15 menit per IP address.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  limit: 5, // Maksimal 5 request
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.",
  },
});

// Terapkan ke route login
publicRouter.post("/api/users/login", loginLimiter, userController.login);
```

Pastikan `loginLimiter` didaftarkan **sebelum** global rate limiter untuk route ini, atau didaftarkan langsung di route-nya (seperti contoh di atas) agar lebih spesifik.

### Verifikasi

Test manual: coba request `POST /api/users/login` lebih dari 5 kali dalam 15 menit → ekspektasi HTTP 429 dengan pesan error yang sesuai.

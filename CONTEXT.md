# Project Context: Utique

Dokumen ini berfungsi sebagai ringkasan teknis dan arsitektur proyek Utique untuk memberikan konteks cepat kepada pengembang atau AI assistant.

**Utique** adalah toko cookies online berbasis pre-order. Nama diambil dari **Utik** (nama ibu pemilik) + **Que** (kue).

---

## 1. Deskripsi Proyek

- **Jenis**: E-Commerce niche (toko cookies online)
- **Model Bisnis**: Pre-order — cookies dibuat setelah pembayaran dikonfirmasi
- **Target Pasar**: Lingkungan dan orang-orang terdekat
- **Kapasitas Produksi**: Maksimal 10 order per hari
- **Pengiriman**: Via jasa ekspedisi (JNE, J&T, dll), input resi manual

---

## 2. Stack & Teknologi

### Backend

- **Runtime**: [Node.js](https://nodejs.org/) / [Bun](https://bun.sh/)
- **Framework**: Express.js
- **ORM & Database**: Prisma dengan **PostgreSQL**
- **Validation**: Zod untuk validasi request body & parameter
- **Security**:
  - `helmet`: Header keamanan HTTP
  - `cors`: Cross-Origin Resource Sharing
  - `express-rate-limit`: Pembatasan jumlah request
  - `bcrypt`: Hashing password
- **File Upload**: Cloudinary (free tier) untuk foto produk
- **Email**: Nodemailer + Gmail SMTP untuk notifikasi
- **Module System**: ES Modules (`import`/`export`)

### Frontend

- **Framework/Build Tool**: Vite + React (JavaScript)
- **Routing**: React Router (Single Page App mode)
- **State Management**: Zustand
- **HTTP Client**: Axios with interceptors
- **Styling**: Vanilla CSS
- **Module System**: ES Modules

---

## 3. Struktur Folder

```text
utique/
├── backend/
│   ├── prisma/               # Skema database & seeder
│   ├── src/
│   │   ├── application/      # Konfigurasi inti (Web & Database)
│   │   ├── controller/       # Handler request HTTP
│   │   ├── services/         # Logika bisnis & interaksi database
│   │   ├── routes/           # Definisi API Router
│   │   ├── middleware/       # Custom middleware (Auth, Upload, dll)
│   │   ├── validation/       # Skema validasi Zod
│   │   ├── error/            # Centralized Error Handling
│   │   ├── jobs/             # Scheduled jobs (auto-cancel, dll)
│   │   └── index.js          # Entry point aplikasi
│   └── tests/                # Unit & Integration testing
│
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable components (ui/ & common/)
│   │   ├── layouts/          # Page layouts (MainLayout, AdminLayout)
│   │   ├── pages/            # Page components
│   │   │   ├── auth/         # Login, Register
│   │   │   ├── customer/     # Home, Katalog, Cart, Checkout, Order, Profile
│   │   │   └── admin/        # Dashboard, Products, Orders
│   │   ├── stores/           # Zustand stores
│   │   ├── router/           # React Router config
│   │   ├── lib/              # Library config (api instance, cloudinary)
│   │   ├── hooks/            # Custom React hooks
│   │   └── main.jsx          # Entry point frontend
│   └── index.css             # Global styles
│
├── CONTEXT.md                # Dokumen ini
└── README.md                 # Cara menjalankan project
```

---

## 4. Konvensi Kode

- **Naming Convention**:
  - Variabel/Fungsi: `camelCase`
  - File/Folder: `kebab-case.js`
  - Komponen React: `PascalCase.jsx`
  - Skema Zod: `[aksi][Domain]Validation` (misal: `createProductValidation`)
  - Komitmen Git: _Conventional Commits_ (`Feature:`, `Fix:`, `Refactor:`, `chore:`)
- **Arsitektur Layer**: `Router → Controller → Service → Prisma`. Validasi hanya di Service, query database hanya di Service.
- **Error Handling**: Terpusat pada `error-middleware.js` menggunakan class `ResponseError`. Selalu gunakan `try...catch` di Controller dan teruskan ke `next(e)`.
- **Validation**: Validasi input dilakukan di layer **Service** menggunakan Zod sebelum menjalankan logika database. Pesan error Zod wajib **Bahasa Indonesia**.
- **Response Format**:
  - Sukses: `{ data: ... }`
  - Error: `{ error: "..." }`
  - List: `{ data: [...], paging: { page, total_item, total_page } }`
- **Paginasi**: Gunakan parameter `page` dan `size`. Query data dan count secara paralel dengan `Promise.all`.
- **Security by Default**: Menggunakan pemisahan Router (`public-api.js` vs `api.js`) untuk memastikan endpoint terproteksi secara eksplisit.
- **Data Isolation**: Setiap query data milik user **wajib** menyertakan `user.id` dalam klausa `where`.

---

## 5. Database Schema

### Tabel Utama

| Tabel | Deskripsi |
|---|---|
| `User` | Data pengguna (customer & admin), dibedakan dengan field `role` |
| `Address` | Alamat pengiriman milik user, mendukung multiple alamat |
| `Product` | Data master cookies (nama, deskripsi, foto, waktu produksi) |
| `Flavor` | Master varian rasa (Choco Chip, Red Velvet, dll) |
| `Size` | Master varian ukuran (Small/10pcs, Medium/20pcs, dll) |
| `ProductVariant` | Kombinasi Product + Flavor + Size dengan harga spesifik |
| `Cart` | Keranjang belanja, 1 cart per user |
| `CartItem` | Item di keranjang, mereferensikan `ProductVariant` |
| `Order` | Pesanan yang sudah di-checkout |
| `OrderItem` | Item dalam order, menyimpan snapshot data produk |
| `Payment` | Bukti pembayaran (upload bukti transfer) |
| `Review` | Review & rating (1-5) dari customer |
| `ProductionQueue` | Antrian produksi, digunakan untuk kalkulasi estimasi |

### Status Flow — Order

```
PENDING_PAYMENT → PAID → IN_QUEUE → IN_PRODUCTION → DONE → SHIPPED → COMPLETED
       ↓
   CANCELLED (auto jika melewati batas waktu bayar)
```

### Status Flow — Payment

```
PENDING → VERIFIED
        → REJECTED
```

> **Catatan**: Detail lengkap database schema termasuk ERD tersedia di dokumen brainstorming terpisah.

---

## 6. Fitur & Halaman

### Customer Pages

| Halaman | Route | Deskripsi |
|---|---|---|
| Home / Landing | `/` | Halaman utama, highlight produk |
| Katalog | `/products` | Daftar semua cookies |
| Detail Produk | `/products/:slug` | Detail cookies + pilih varian + add to cart |
| Keranjang | `/cart` | Daftar item di keranjang |
| Checkout | `/checkout` | Pilih alamat, review pesanan |
| Pembayaran | `/payment/:orderId` | Info rekening toko + upload bukti bayar |
| Riwayat Pesanan | `/orders` | Daftar semua pesanan user |
| Detail Pesanan | `/orders/:id` | Status, estimasi, resi, link tracking |
| Profil | `/profile` | Edit profil & kelola alamat |
| Login | `/login` | Halaman login |
| Register | `/register` | Halaman registrasi |

### Admin Pages

| Halaman | Route | Deskripsi |
|---|---|---|
| Dashboard | `/admin` | Overview order & ringkasan hari ini |
| Manajemen Produk | `/admin/products` | CRUD produk cookies |
| Form Produk | `/admin/products/new`, `/admin/products/:id/edit` | Tambah/edit produk + upload foto |
| Manajemen Order | `/admin/orders` | Daftar semua order |
| Detail Order | `/admin/orders/:id` | Konfirmasi bayar, update status, input resi |

---

## 7. Status Progress API

> Urutan implementasi berdasarkan dependency — kerjakan dari atas ke bawah.

### Tahap 1 — Auth & User (Fondasi)

1. [x] `POST /api/users` — Registrasi akun baru
2. [x] `POST /api/users/login` — Login untuk mendapatkan token akses
3. [x] `GET /api/users/current` — Mengambil profil user yang sedang login
4. [x] `PATCH /api/users/current` — Memperbarui profil user (nama, email, password)
5. [x] `DELETE /api/users/logout` — Menghapus token (Logout)

### Tahap 2 — Master Data Admin (Flavor, Size, Product, Variant)

6. [ ] `POST /api/admin/flavors` — Menambahkan rasa baru
7. [ ] `GET /api/admin/flavors` — Mengambil list rasa
8. [ ] `POST /api/admin/sizes` — Menambahkan ukuran baru
9. [ ] `GET /api/admin/sizes` — Mengambil list ukuran
10. [ ] `POST /api/admin/products` — Menambahkan produk baru (+ upload foto)
11. [ ] `PATCH /api/admin/products/:id` — Memperbarui produk
12. [ ] `DELETE /api/admin/products/:id` — Menghapus produk
13. [ ] `POST /api/admin/products/:id/variants` — Menambahkan varian produk (flavor + size + harga)
14. [ ] `PATCH /api/admin/variants/:id` — Memperbarui varian (harga, ketersediaan)
15. [ ] `DELETE /api/admin/variants/:id` — Menghapus varian

### Tahap 3 — Produk Public (Customer Bisa Browse)

16. [ ] `GET /api/products` — Mengambil list produk cookies (paginasi & filter)
17. [ ] `GET /api/products/:slug` — Mengambil detail produk + varian + review

### Tahap 4 — Alamat Pengiriman

18. [ ] `POST /api/addresses` — Menambahkan alamat baru
19. [ ] `GET /api/addresses` — Mengambil list alamat user
20. [ ] `PATCH /api/addresses/:id` — Memperbarui alamat
21. [ ] `DELETE /api/addresses/:id` — Menghapus alamat

### Tahap 5 — Keranjang (Cart)

22. [ ] `GET /api/cart` — Mengambil isi keranjang
23. [ ] `POST /api/cart/items` — Menambahkan item ke keranjang
24. [ ] `PATCH /api/cart/items/:id` — Mengubah quantity item
25. [ ] `DELETE /api/cart/items/:id` — Menghapus item dari keranjang

### Tahap 6 — Order & Checkout

26. [ ] `POST /api/orders` — Membuat order dari keranjang (checkout)
27. [ ] `GET /api/orders` — Mengambil list pesanan user
28. [ ] `GET /api/orders/:id` — Mengambil detail pesanan (status, estimasi, resi)

### Tahap 7 — Pembayaran

29. [ ] `POST /api/orders/:orderId/payment` — Upload bukti pembayaran
30. [ ] `PATCH /api/admin/payments/:id/verify` — Admin: verifikasi pembayaran
31. [ ] `PATCH /api/admin/payments/:id/reject` — Admin: tolak pembayaran

### Tahap 8 — Manajemen Order Admin

32. [ ] `GET /api/admin/orders` — Mengambil semua order (filter status)
33. [ ] `GET /api/admin/orders/:id` — Mengambil detail order
34. [ ] `PATCH /api/admin/orders/:id/status` — Mengubah status order
35. [ ] `PATCH /api/admin/orders/:id/shipping` — Input info pengiriman (resi, kurir)
36. [ ] `PATCH /api/admin/orders/:id/estimation` — Override estimasi pembuatan

### Tahap 9 — Review _(Fase 2)_

37. [ ] `POST /api/products/:productId/reviews` — Customer: menambahkan review & rating

### Tahap 10 — Dashboard & Statistik _(Fase 2)_

38. [ ] `GET /api/admin/dashboard` — Ringkasan order hari ini
39. [ ] `GET /api/admin/statistics` — Statistik penjualan (produk terlaris, revenue, trend)

---

## 8. Keputusan Arsitektur Penting

1. **Single Frontend App**: Satu aplikasi React untuk customer dan admin. Akses admin dilindungi oleh role-based routing dan middleware backend.
2. **Pemisahan Router**: Router dibagi menjadi `publicRouter` dan `apiRouter` (customer) dan `adminRouter` (admin). Masing-masing menggunakan middleware auth yang sesuai.
3. **Stateless Authentication**: Database menyimpan `token` pada tabel `User`. Validasi dilakukan dengan mencocokkan token di header `Authorization` dengan database.
4. **Snapshot Pattern**: `OrderItem` menyimpan snapshot data produk (`product_name`, `flavor_name`, `size_name`, `price`) agar data historis tetap akurat meskipun master data produk berubah.
5. **Semi-Automatic Estimation**: Estimasi produksi dihitung otomatis berdasarkan `production_time_days` + antrian (`ProductionQueue`), tetapi admin bisa override manual.
6. **Production Capacity**: Sistem memeriksa tabel `ProductionQueue` untuk memastikan tidak melebihi 10 order per hari. Order yang melebihi kapasitas digeser ke hari berikutnya.
7. **Auto-Cancel Payment**: Scheduled job (cron) memeriksa order `PENDING_PAYMENT` yang melewati `payment_deadline` dan otomatis mengubah statusnya menjadi `CANCELLED`.
8. **Review Constraint**: User hanya bisa review setelah order berstatus `COMPLETED`, dan hanya bisa review 1x per produk per order.
9. **Validation Messaging**: Pesan error Zod dikustomisasi menggunakan Bahasa Indonesia untuk kemudahan integrasi dengan Frontend.
10. **Flat Rate Shipping**: Ongkir menggunakan flat rate per zona untuk tahap awal. Integrasi API ongkir (RajaOngkir) direncanakan untuk fase lanjutan.
11. **Prisma 7 Driver Adapter**: Menggunakan `@prisma/adapter-pg` dan `pg` pool untuk koneksi database guna mendukung fleksibilitas konfigurasi di Prisma 7.

---

## 9. Hosting & Deployment

| Service | Fungsi |
|---|---|
| **Vercel** | Deploy frontend React |
| **Railway** atau **Render** | Deploy backend Express |
| **Neon** atau **Supabase** | PostgreSQL database |
| **Cloudinary** | Upload & serve foto produk |

---

## 10. Cara Menjalankan Project

### Backend

1. Masuk ke folder backend: `cd backend`
2. Install dependensi: `npm install` atau `bun install`
3. Duplikat `.env.example` menjadi `.env` dan sesuaikan `DATABASE_URL` (PostgreSQL).
4. Pastikan `DATABASE_URL` diatur di `.env`. Koneksi dikelola di `src/application/database.js` menggunakan driver adapter.
5. Generate Prisma Client: `npx prisma generate`
6. Sinkronisasi database: `npx prisma db push`
7. Jalankan server dev: `npm run dev` atau `bun run dev`

### Frontend

1. Masuk ke folder frontend: `cd frontend`
2. Install dependensi: `npm install` atau `bun install`
3. Jalankan aplikasi: `npm run dev` atau `bun run dev`

---

## 11. Konvensi Git & Kolaborasi

### Judul Issue
- Format: `Feature: Nama Fitur` / `Fix: Nama Bug`
- Bahasa: Indonesia
- Contoh: `Feature: Implementasi API Create Product`

### Judul Pull Request
- Format: Sama dengan judul issue yang diselesaikan
- Contoh: `Feature: Implementasi API Create Product`

---

## 12. Instruksi untuk AI Assistant

### Sebelum mulai task

- Baca dan pahami seluruh isi CONTEXT.md ini
- Ikuti semua konvensi yang tertulis di sini
- Jangan berasumsi di luar yang tertulis di CONTEXT.md

### Pada saat menjalankan task

- Untuk AI Assistant yang melakukan coding:
  Selalu buat dokumentasinya di baris program, jelaskan kegunaan function/method dengan bahasa Indonesia yang mudah dimengerti.
  Jika ada perubahan logic pada setiap function, lakukan juga perubahan dokumentasinya.
  Selalu buat unit test untuk setiap API atau fitur baru yang ditambahkan atau setelah kode diperbaiki.
  Selalu jalankan unit test yang sudah dibuat, dan harus lolos test dengan benar.
  Jangan langsung lakukan commit, push, pull request jika tidak diminta.
- Untuk AI Assistant yang ditugaskan untuk membuat issue.md, jika tidak ada perintah untuk implementasi, jangan lakukan implementasi kode.
- Untuk AI Assistant yang ditugaskan untuk mereview tidak perlu melakukan coding, lakukan review dan buatkan prompt yang sesuai dengan hasil review untuk digunakan oleh AI yang melakukan coding.

### Setelah selesai task

- Update CONTEXT.md jika ada:
  - API baru yang selesai diimplementasi
  - Keputusan arsitektur baru
  - Perubahan konvensi kode
  - Dependency baru yang ditambahkan
- Jangan update CONTEXT.md jika hanya bug fix kecil atau perubahan yang tidak mempengaruhi arsitektur

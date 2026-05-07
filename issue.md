# Feature: Setup Database PostgreSQL & Koneksi Prisma

## Deskripsi

Melakukan setup database PostgreSQL untuk project Utique, termasuk membuat database `utique_db`, mengkonfigurasi file `.env` dengan kredensial yang benar, men-generate Prisma Client, dan melakukan sinkronisasi schema ke database agar semua tabel siap digunakan.

Schema Prisma sudah tersedia di `backend/prisma/schema.prisma` hasil dari fase scaffolding. Issue ini fokus pada **koneksi dan sinkronisasi** ke database PostgreSQL lokal.

---

## Konteks

- **Prisma Schema** sudah di-scaffold lengkap dengan 12 model/tabel:
  - `User`, `Address`, `Product`, `Flavor`, `Size`, `ProductVariant`, `Cart`, `CartItem`, `Order`, `OrderItem`, `Payment`, `Review`, `ProductionQueue`
- **Prisma Client** (`@prisma/client@^7.8.0`) dan `prisma` CLI (`^7.8.0`) sudah terinstall di `package.json`
- **File konfigurasi** `prisma.config.ts` sudah ada dan mengarah ke `prisma/schema.prisma`
- **Database config** (`database.js`) sudah ada di `src/application/database.js` dengan Prisma Client yang siap digunakan
- **File `.env` belum dibuat** — hanya ada `.env.example` sebagai template

---

## Kredensial Database

| Key | Value |
|---|---|
| **Username** | `postgres` |
| **Password** | `12345` |
| **Host** | `localhost` |
| **Port** | `5432` |
| **Database** | `utique_db` |

**DATABASE_URL**: `postgresql://postgres:12345@localhost:5432/utique_db?schema=public`

---

## Langkah Implementasi

### 1. Buat Database di PostgreSQL

Buat database `utique_db` di PostgreSQL lokal menggunakan salah satu cara berikut:

**Opsi A — Via Command Line (psql):**

```bash
psql -U postgres -c "CREATE DATABASE utique_db;"
```

**Opsi B — Via SQL Query di pgAdmin atau tool lain:**

```sql
CREATE DATABASE utique_db;
```

### 2. Buat File `.env`

Buat file `backend/.env` berdasarkan template `.env.example` dengan kredensial yang sudah ditentukan:

```env
# Database
DATABASE_URL="postgresql://postgres:12345@localhost:5432/utique_db?schema=public"

# Server
PORT=5000

# Email (Nodemailer + Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Payment deadline (dalam jam)
PAYMENT_DEADLINE_HOURS=24
```

> [!NOTE]
> Untuk saat ini, hanya `DATABASE_URL` dan `PORT` yang perlu diisi dengan nilai yang benar. Kredensial Email dan Cloudinary bisa diisi nanti saat fitur tersebut diimplementasi.

### 3. Generate Prisma Client

Jalankan perintah berikut untuk men-generate Prisma Client berdasarkan schema:

```bash
cd backend
npx prisma generate
```

**Hasil yang diharapkan:**

- Folder `node_modules/.prisma/client` ter-generate
- Prisma Client siap digunakan oleh `src/application/database.js`

### 4. Sinkronisasi Schema ke Database

Gunakan `prisma db push` untuk membuat semua tabel di database berdasarkan schema:

```bash
cd backend
npx prisma db push
```

**Hasil yang diharapkan:**

Semua tabel berikut berhasil dibuat di database `utique_db`:

| Tabel | Deskripsi |
|---|---|
| `users` | Data pengguna (customer & admin), dengan field `role` |
| `addresses` | Alamat pengiriman milik user, mendukung multiple alamat |
| `products` | Data master cookies (nama, slug, deskripsi, foto, waktu produksi) |
| `flavors` | Master varian rasa (Choco Chip, Red Velvet, dll) |
| `sizes` | Master varian ukuran (Small, Medium, Large + deskripsi jumlah) |
| `product_variants` | Kombinasi Product + Flavor + Size dengan harga spesifik |
| `carts` | Keranjang belanja (1 cart per user) |
| `cart_items` | Item di dalam keranjang, mereferensikan product_variant |
| `orders` | Pesanan yang sudah di-checkout |
| `order_items` | Item dalam order, menyimpan snapshot data produk |
| `payments` | Bukti pembayaran (upload bukti transfer) |
| `reviews` | Review & rating (1-5) dari customer |
| `production_queue` | Antrian produksi untuk kalkulasi estimasi |

### 5. Verifikasi Tabel dengan Prisma Studio

Buka Prisma Studio untuk memverifikasi secara visual bahwa semua tabel sudah terbuat:

```bash
cd backend
npx prisma studio
```

**Prisma Studio** akan terbuka di browser (default: `http://localhost:5555`) dan menampilkan semua model/tabel yang ada di database.

---

## Verifikasi

Setelah semua langkah selesai, pastikan hal-hal berikut:

- [ ] Database `utique_db` berhasil dibuat di PostgreSQL lokal
- [ ] File `backend/.env` sudah dibuat dengan `DATABASE_URL` yang benar
- [ ] `npx prisma generate` berhasil tanpa error
- [ ] `npx prisma db push` berhasil tanpa error — semua 13 tabel terbuat
- [ ] `npx prisma studio` menampilkan semua model/tabel dengan benar
- [ ] Tidak ada perubahan kode pada Prisma schema (menggunakan schema yang sudah ada)

---

## Catatan

### Enum yang Dibuat

Schema ini menggunakan 3 PostgreSQL enum:

| Enum | Nilai |
|---|---|
| `Role` | `CUSTOMER`, `ADMIN` |
| `OrderStatus` | `PENDING_PAYMENT`, `PAID`, `IN_QUEUE`, `IN_PRODUCTION`, `DONE`, `SHIPPED`, `COMPLETED`, `CANCELLED` |
| `PaymentStatus` | `PENDING`, `VERIFIED`, `REJECTED` |

### Relasi Antar Tabel

```
User ──1:N──> Address
User ──1:1──> Cart ──1:N──> CartItem ──N:1──> ProductVariant
User ──1:N──> Order ──1:N──> OrderItem ──N:1──> ProductVariant
User ──1:N──> Review ──N:1──> Product

Product ──1:N──> ProductVariant <──N:1── Flavor
                                <──N:1── Size

Order ──1:1──> Payment
Order ──1:1──> ProductionQueue
Order ──N:1──> Address
```

### Unique Constraints

| Tabel | Constraint |
|---|---|
| `users` | `email` (unique) |
| `products` | `slug` (unique) |
| `flavors` | `name` (unique) |
| `sizes` | `name` (unique) |
| `product_variants` | `product_id` + `flavor_id` + `size_id` (composite unique) |
| `carts` | `user_id` (unique — 1 cart per user) |
| `cart_items` | `cart_id` + `product_variant_id` (composite unique) |
| `orders` | `order_number` (unique) |
| `payments` | `order_id` (unique — 1 payment per order) |
| `reviews` | `user_id` + `product_id` + `order_id` (composite unique) |
| `production_queue` | `order_id` (unique — 1 queue entry per order) |

---

## Referensi

- Prisma Schema: [`backend/prisma/schema.prisma`](file:///d:/Development/Web/Project/Projek%20Oka/utique/backend/prisma/schema.prisma)
- Database Config: [`backend/src/application/database.js`](file:///d:/Development/Web/Project/Projek%20Oka/utique/backend/src/application/database.js)
- Prisma Config: [`backend/prisma.config.ts`](file:///d:/Development/Web/Project/Projek%20Oka/utique/backend/prisma.config.ts)
- Environment Template: [`backend/.env.example`](file:///d:/Development/Web/Project/Projek%20Oka/utique/backend/.env.example)
- Brainstorming: [`brainstorming_utique.md`](file:///d:/Development/Web/Project/Projek%20Oka/utique/brainstorming_utique.md)
- Context: [`CONTEXT.md`](file:///d:/Development/Web/Project/Projek%20Oka/utique/CONTEXT.md)

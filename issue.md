# Issue: Feature — Implementasi API Checkout (POST /api/orders)

## 1. Background & Tujuan

Fitur ini mengimplementasikan endpoint checkout — proses mengubah isi keranjang belanja (Cart) menjadi sebuah Order resmi. Ini adalah inti dari alur transaksi di Utique.

Ketika customer menekan tombol "Checkout", sistem harus:

- Mengambil semua item dari keranjang milik customer
- Memvalidasi ketersediaan setiap varian produk
- Menghitung total harga dari database (bukan dari client, untuk mencegah manipulasi)
- Mengecek kapasitas produksi harian (maks 10 order/hari)
- Menghitung estimasi tanggal selesai berdasarkan antrian produksi
- Membuat record Order, OrderItem (snapshot), dan ProductionQueue secara atomic
- Mengosongkan keranjang setelah order berhasil dibuat

Semua operasi database harus dijalankan dalam satu transaksi (`prisma.$transaction()`) agar jika salah satu langkah gagal, seluruh proses di-rollback.

---

## 2. Spesifikasi Teknis

### Endpoint

```
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json
```

Endpoint ini masuk ke **`api.js`** (apiRouter) — wajib login, tidak perlu role admin.

### Request Body

```json
{
  "addressId": 1
}
```

| Field       | Tipe    | Wajib | Keterangan                                        |
| ----------- | ------- | ----- | ------------------------------------------------- |
| `addressId` | Integer | ✅    | ID alamat pengiriman milik user yang sedang login |

> **Catatan**: Item tidak dikirim dari client. Sistem mengambil langsung dari Cart milik user.

### Response — Sukses `201 Created`

```json
{
  "data": {
    "id": "uuid",
    "status": "PENDING_PAYMENT",
    "payment_deadline": "2026-06-03T10:00:00.000Z",
    "estimated_done_date": "2026-06-05",
    "total_price": 150000,
    "address": {
      "recipient_name": "Budi Santoso",
      "phone": "08123456789",
      "full_address": "Jl. Merdeka No. 1",
      "city": "Palembang",
      "province": "Sumatera Selatan",
      "postal_code": "30111"
    },
    "items": [
      {
        "id": "uuid",
        "product_name": "Choco Chip Cookie",
        "flavor_name": "Chocolate",
        "size_name": "Medium/20pcs",
        "quantity": 2,
        "unit_price": 50000,
        "subtotal": 100000
      }
    ]
  }
}
```

### Response — Error

| Kondisi                                                 | HTTP Status | Pesan Error                                                   |
| ------------------------------------------------------- | ----------- | ------------------------------------------------------------- |
| Token tidak valid / tidak ada                           | `401`       | `"Unauthorized"`                                              |
| `addressId` tidak dikirim / bukan integer               | `400`       | `"addressId harus berupa angka"`                              |
| Alamat tidak ditemukan / bukan milik user               | `404`       | `"Alamat tidak ditemukan"`                                    |
| Keranjang kosong                                        | `400`       | `"Keranjang belanja masih kosong"`                            |
| Salah satu varian tidak tersedia (`isAvailable: false`) | `400`       | `"Produk [nama] varian [flavor/size] sudah tidak tersedia"`   |
| Kapasitas produksi penuh untuk semua hari yang dicek    | `400`       | `"Kapasitas produksi penuh, silakan coba beberapa saat lagi"` |

---

## 3. Step-by-Step Implementasi

### Step 1 — Buat Validation Schema (`src/validation/order-validation.js`)

Buat file baru `src/validation/order-validation.js`.

Buat dan export satu schema Zod bernama `createOrderValidation`:

```js
export const createOrderValidation = z.object({
  addressId: z
    .number({
      required_error: "addressId wajib diisi",
      invalid_type_error: "addressId harus berupa angka",
    })
    .int("addressId harus berupa bilangan bulat")
    .positive("addressId tidak valid"),
});
```

---

### Step 2 — Buat Service (`src/services/order-service.js`)

Buat file baru `src/services/order-service.js`.

Buat dan export satu fungsi async bernama `createOrder(user, request)`.

Di dalam fungsi ini, lakukan langkah-langkah berikut **secara berurutan**:

**2a. Validasi input**

- Validasi `request` menggunakan `createOrderValidation` dari Zod.
- Jika gagal, lempar `ResponseError(400, pesan)`.

**2b. Validasi alamat**

- Query `Address` dengan kondisi `id = addressId AND userId = user.id`.
- Jika tidak ditemukan, lempar `ResponseError(404, "Alamat tidak ditemukan")`.

**2c. Ambil isi keranjang**

- Query `Cart` milik user, include `CartItem` beserta relasi `ProductVariant` → `Product`, `Flavor`, `Size`.
- Gunakan kondisi: `cart.userId = user.id`.
- Jika `cart` tidak ada atau `cart.items` kosong, lempar `ResponseError(400, "Keranjang belanja masih kosong")`.

**2d. Validasi ketersediaan varian**

- Loop setiap `CartItem`, cek `cartItem.variant.isAvailable === true`.
- Jika ada yang `false`, lempar `ResponseError(400, "Produk [product.name] varian [flavor.name]/[size.name] sudah tidak tersedia")`.

**2e. Hitung total harga**

- Loop setiap `CartItem`, hitung `subtotal = cartItem.quantity * cartItem.variant.price`.
- Jumlahkan semua subtotal menjadi `totalPrice`.

**2f. Hitung estimasi & kapasitas produksi**

- Tentukan `startDate` = hari ini (tanggal server, bukan client).
- Query `ProductionQueue` untuk menghitung jumlah order per hari mulai dari `startDate`.
- Cari hari pertama yang jumlah ordernya < 10 (kapasitas maks).
- Hari itu menjadi `productionDate` (tanggal mulai produksi).
- `estimated_done_date` = `productionDate` + `product.production_time_days` (ambil dari produk dengan `production_time_days` terbesar di cart, atau rata-rata — tentukan sendiri dan dokumentasikan pilihan ini di kode).
- Jika tidak ada hari yang tersedia dalam 30 hari ke depan, lempar `ResponseError(400, "Kapasitas produksi penuh, silakan coba beberapa saat lagi")`.

**2g. Jalankan transaksi Prisma**

Gunakan `prisma.$transaction(async (tx) => { ... })` untuk operasi berikut:

1. Buat record `Order`:

   ```
   status: "PENDING_PAYMENT"
   userId: user.id
   addressId: address.id
   totalPrice: totalPrice
   paymentDeadline: sekarang + 24 jam
   estimatedDoneDate: estimated_done_date
   ```

2. Buat semua `OrderItem` (snapshot) — loop dari CartItem:

   ```
   orderId: order.id
   productVariantId: cartItem.variantId
   productName: cartItem.variant.product.name   ← snapshot
   flavorName: cartItem.variant.flavor.name     ← snapshot
   sizeName: cartItem.variant.size.name         ← snapshot
   quantity: cartItem.quantity
   unitPrice: cartItem.variant.price            ← snapshot
   subtotal: cartItem.quantity * cartItem.variant.price
   ```

3. Buat record `ProductionQueue`:

   ```
   orderId: order.id
   scheduledDate: productionDate
   ```

4. Hapus semua `CartItem` milik cart user (kosongkan keranjang):
   ```
   deleteMany where cartId = cart.id
   ```

**2h. Return response**

- Setelah transaksi berhasil, query ulang `Order` by id dengan include `OrderItem` dan `Address`.
- Format dan return data sesuai spesifikasi response di bagian 2.

---

### Step 3 — Buat Controller (`src/controller/order-controller.js`)

Buat file baru `src/controller/order-controller.js`.

Buat dan export satu fungsi async bernama `create(req, res, next)`:

```js
export const create = async (req, res, next) => {
  try {
    const result = await createOrder(req.user, req.body);
    res.status(201).json({ data: result });
  } catch (e) {
    next(e);
  }
};
```

`req.user` sudah diset oleh `auth-middleware.js` (sudah ada).

---

### Step 4 — Daftarkan Route (`src/routes/api.js`)

Buka file `src/routes/api.js` yang sudah ada.

Import controller:

```js
import * as orderController from "../controller/order-controller.js";
```

Tambahkan route baru:

```js
apiRouter.post("/orders", orderController.create);
```

Pastikan route ini berada **di bawah** middleware auth (sudah terpasang di level router).

---

### Step 5 — Buat Unit Test (`tests/order.test.js`)

Buat file baru `tests/order.test.js`.

Gunakan pendekatan **integration test** dengan `supertest` dan database test nyata (sama seperti test file lain yang sudah ada — lihat `test-util.js` untuk helper).

**Setup & Teardown**

- `beforeEach`: Buat user test, buat address test, buat produk + variant test, buat cart + cart item test. Gunakan helper dari `test-util.js` atau buat fungsi helper lokal.
- `afterEach`: Hapus semua data test (order, cart, product, address, user) agar test tidak saling interferensi.

**Test Cases yang wajib dibuat:**

```
✅ Berhasil membuat order dari keranjang yang valid
   - Kirim request dengan addressId yang valid
   - Cek response status 201
   - Cek response body memiliki: id, status, payment_deadline, estimated_done_date, total_price, address, items
   - Cek status order = "PENDING_PAYMENT"
   - Cek cart kosong setelah checkout (query CartItem = 0)
   - Cek ProductionQueue dibuat

✅ Gagal jika tidak ada token (401)

✅ Gagal jika addressId tidak dikirim (400)

✅ Gagal jika addressId bukan integer (400)

✅ Gagal jika addressId milik user lain (404)

✅ Gagal jika keranjang kosong (400)

✅ Gagal jika salah satu varian tidak tersedia / isAvailable: false (400)
```

---

## 4. Acceptance Criteria

### Fungsionalitas

- [ ] `POST /api/orders` berhasil membuat order dari cart yang valid dan mengembalikan status `201`
- [ ] Response body sesuai format spesifikasi (ada `id`, `status`, `payment_deadline`, `estimated_done_date`, `total_price`, `address`, `items`)
- [ ] `status` order yang baru dibuat selalu `PENDING_PAYMENT`
- [ ] `payment_deadline` diset +24 jam dari waktu checkout
- [ ] `total_price` dihitung dari database (ProductVariant.price × quantity), bukan dari client
- [ ] Data `OrderItem` berisi snapshot (`product_name`, `flavor_name`, `size_name`, `unit_price`) — bukan foreign key ke master data
- [ ] Cart dikosongkan (CartItem dihapus) setelah order berhasil dibuat
- [ ] Record `ProductionQueue` dibuat untuk order baru

### Validasi & Error Handling

- [ ] Request tanpa token → `401`
- [ ] `addressId` tidak dikirim → `400` dengan pesan Bahasa Indonesia
- [ ] `addressId` bukan milik user yang login → `404`
- [ ] Cart kosong → `400` dengan pesan Bahasa Indonesia
- [ ] Varian tidak tersedia → `400` dengan pesan menyebut nama produk & varian
- [ ] Kapasitas produksi penuh → `400` dengan pesan Bahasa Indonesia

### Keamanan & Konsistensi

- [ ] Harga tidak bisa dimanipulasi dari client (diambil dari DB)
- [ ] Semua operasi DB dalam satu `prisma.$transaction()` — jika satu gagal, semua rollback
- [ ] Query alamat selalu menyertakan `userId = user.id` (data isolation)
- [ ] Query cart selalu menyertakan `userId = user.id` (data isolation)

### Testing

- [ ] Semua test case di Step 5 sudah dibuat
- [ ] Semua test **lolos** (`bun test` atau `npm test` tidak ada yang fail)
- [ ] Tidak ada data test yang tersisa setelah test selesai (cleanup di `afterEach`)

### Kode

- [ ] Setiap function memiliki komentar dokumentasi dalam Bahasa Indonesia
- [ ] Error diteruskan ke `next(e)` di controller (tidak di-handle langsung)
- [ ] Tidak ada logic database di controller (hanya di service)
- [ ] File mengikuti konvensi nama: `kebab-case.js`

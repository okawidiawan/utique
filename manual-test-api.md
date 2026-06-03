# Manual Testing API - Utique

Dokumentasi ini berisi daftar endpoint API Utique yang disusun berdasarkan tahapan implementasi di `CONTEXT.md`.

**Base URL:** `http://localhost:5000`

---

## Tabel Ringkasan

| Fase | Method | Endpoint | Deskripsi | Auth |
| :--- | :--- | :--- | :--- | :--- |
| **0** | **GET** | `/api/health` | Cek status backend | No |
| **1** | **POST** | `/api/users` | Registrasi akun baru | No |
| **1** | **POST** | `/api/users/login` | Login (Dapatkan Token) | No |
| **1** | **GET** | `/api/users/current` | Ambil profil saya | User |
| **1** | **PATCH** | `/api/users/current` | Update profil | User |
| **1** | **DELETE** | `/api/users/logout` | Logout | User |
| **2** | **POST** | `/api/admin/flavors` | Tambah rasa (Admin) | Admin |
| **2** | **GET** | `/api/admin/flavors` | List semua rasa | Admin |
| **2** | **POST** | `/api/admin/sizes` | Tambah ukuran (Admin) | Admin |
| **2** | **GET** | `/api/admin/sizes` | List semua ukuran | Admin |
| **2** | **POST** | `/api/admin/products` | Tambah produk baru | Admin |
| **2** | **PATCH** | `/api/admin/products/:id` | Update produk | Admin |
| **2** | **DELETE** | `/api/admin/products/:id` | Hapus produk | Admin |
| **2** | **POST** | `/api/admin/products/:id/variants` | Tambah varian produk | Admin |    
| **2** | **PATCH** | `/api/admin/variants/:id` | Update varian | Admin |
| **2** | **DELETE** | `/api/admin/variants/:id` | Hapus varian | Admin |
| **3** | **GET** | `/api/products` | Cari/List produk | No |
| **3** | **GET** | `/api/products/:slug` | Detail produk (+ varian) | No |
| **4** | **POST** | `/api/addresses` | Tambah alamat baru | User |
| **4** | **GET** | `/api/addresses` | List alamat saya | User |
| **4** | **PATCH** | `/api/addresses/:id` | Update alamat | User |
| **4** | **DELETE** | `/api/addresses/:id` | Hapus alamat | User |
| **5** | **GET** | `/api/cart` | Lihat isi keranjang | User |
| **5** | **POST** | `/api/cart/items` | Tambah item ke keranjang | User |
| **5** | **PATCH** | `/api/cart/items/:id` | Update item keranjang | User |
| **5** | **DELETE** | `/api/cart/items/:id` | Hapus item keranjang | User |
| **6** | **POST** | `/api/orders` | Checkout (Buat Order) | User |
| **6** | **GET** | `/api/orders` | List pesanan saya | User |
| **6** | **GET** | `/api/orders/:id` | Detail pesanan | User |
| **7** | **POST** | `/api/orders/:orderId/payment` | Upload bukti bayar | User |
| **7** | **PATCH** | `/api/admin/payments/:id/verify` | Verifikasi bayar | Admin |
| **7** | **PATCH** | `/api/admin/payments/:id/reject` | Tolak bayar | Admin |
| **8** | **GET** | `/api/admin/orders` | List semua order (Admin) | Admin |
| **8** | **GET** | `/api/admin/orders/:id` | Detail order (Admin) | Admin |
| **8** | **PATCH** | `/api/admin/orders/:id/status` | Update status order | Admin |
| **8** | **PATCH** | `/api/admin/orders/:id/shipping` | Input info pengiriman | Admin |
| **8** | **PATCH** | `/api/admin/orders/:id/estimation` | Override estimasi | Admin |

---

## Tahap 0: Utility

### Health Check
- **URL:** `GET http://localhost:5000/api/health`
- **Response Sukses (200 OK):**
  ```json
  { "data": { "status": "OK", "service": "Utique API" } }
  ```

---

## Tahap 1: Auth & User

### Register
- **URL:** `POST http://localhost:5000/api/users`
- **Body:**
  ```json
  {
    "name": "Budi Santoso",
    "email": "budi@example.com",
    "password": "password123",
    "phone": "08123456789"
  }
  ```

### Login
- **URL:** `POST http://localhost:5000/api/users/login`
- **Body:** `{"email": "budi@example.com", "password": "password123"}`
- **Response:** `{"data": {"token": "uuid-token-here"}}`

### Current User Profile
- **URL:** `GET http://localhost:5000/api/users/current`
- **Headers:** `Authorization: Bearer <token>`

---

## Tahap 2: Master Data Admin (Auth Admin Required)

### Flavor Management (Rasa)
- **POST** `/api/admin/flavors` -> Body: `{"name": "Double Choco"}`
- **GET** `/api/admin/flavors`

### Size Management (Ukuran)
- **POST** `/api/admin/sizes` -> Body: `{"name": "Large Jar", "description": "30pcs"}`      
- **GET** `/api/admin/sizes`

### Product Management (Cookies)
- **POST** `/api/admin/products`
  ```json
  {
    "name": "Classic Choco Cookies",
    "description": "Cookies legendaris",
    "productionTimeDays": 3,
    "imageUrl": "http://img.url"
  }
  ```

### Variant Management (Harga)
- **POST** `/api/admin/products/:id/variants`
  ```json
  {
    "productId": 1,
    "flavorId": 1,
    "sizeId": 1,
    "price": 85000
  }
  ```

---

## Tahap 3: Produk Public

### Search Products
- **URL:** `GET http://localhost:5000/api/products?name=choco&page=1&size=10`

### Product Detail
- **URL:** `GET http://localhost:5000/api/products/classic-choco-cookies`

---

## Tahap 4: Alamat Pengiriman

### Create Address
- **URL:** `POST http://localhost:5000/api/addresses`
- **Body:**
  ```json
  {
    "label": "Rumah",
    "recipientName": "Budi",
    "phone": "0812...",
    "province": "Jawa Barat",
    "city": "Bandung",
    "district": "Coblong",
    "postalCode": "40132",
    "fullAddress": "Jl. Ganesha No 10",
    "isDefault": true
  }
  ```

---

## Tahap 5: Keranjang (Cart)

### Get Cart
- **URL:** `GET http://localhost:5000/api/cart`

### Add to Cart
- **URL:** `POST http://localhost:5000/api/cart/items`
- **Body:** `{"variant_id": 1, "quantity": 2}`

### Update Cart Item
- **URL:** `PATCH http://localhost:5000/api/cart/items/:id`
- **Body:** `{"quantity": 3, "variant_id": 2}`
- **Response Error (404):** `{"error": "Item tidak ditemukan di dalam keranjang."}`

### Delete Cart Item
- **URL:** `DELETE http://localhost:5000/api/cart/items/:id`
- **Response Sukses (200 OK):**
  ```json
  {
    "data": {
      "message": "Item berhasil dihapus dari keranjang"
    }
  }
  ```

---

## Tahap 6: Order & Checkout

### Create Order (Checkout)
- **URL:** `POST http://localhost:5000/api/orders`
- **Body:**
  ```json
  {
    "address_id": 1,
    "shipping_courier": "JNE"
  }
  ```
- **Keterangan:** Mengambil item dari keranjang user, membuat record order, snaphot item, dan mengosongkan keranjang.

### List Orders
- **URL:** `GET http://localhost:5000/api/orders`

### Order Detail
- **URL:** `GET http://localhost:5000/api/orders/:id`

---

## Tahap 7: Pembayaran (Payment)

### Upload Bukti Pembayaran
- **URL:** `POST http://localhost:5000/api/orders/:orderId/payment`
- **Body (multipart/form-data):**
  - `proof_image`: File (jpg/png/webp)
- **Keterangan:** Mengupload bukti transfer. Status order tetap `PENDING_PAYMENT`, status payment `PENDING`.

### Verifikasi Pembayaran (Admin)
- **URL:** `PATCH http://localhost:5000/api/admin/payments/:id/verify`
- **Body:** `{"notes": "Sudah masuk Rp 150.000"}`
- **Keterangan:** Mengubah status payment ke `VERIFIED` dan status order ke `PAID`.

### Tolak Pembayaran (Admin)
- **URL:** `PATCH http://localhost:5000/api/admin/payments/:id/reject`
- **Body:** `{"reason": "Bukti tidak jelas"}`
- **Keterangan:** Mengubah status payment ke `REJECTED`. Status order tetap `PENDING_PAYMENT`.

---

## Tahap 8: Manajemen Order Admin

### List Semua Order (Admin)
- **URL:** `GET http://localhost:5000/api/admin/orders`
- **Headers:** `Authorization: Bearer <admin_token>`
- **Query Params:** `?status=PAID&page=1&size=10`
- **Response Sukses (200 OK):**
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

### Detail Order (Admin)
- **URL:** `GET http://localhost:5000/api/admin/orders/:id`
- **Headers:** `Authorization: Bearer <admin_token>`
- **Response Sukses (200 OK):**
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

### Update Status Order (Admin)
- **URL:** `PATCH http://localhost:5000/api/admin/orders/:id/status`
- **Headers:** `Authorization: Bearer <admin_token>`
- **Body:** `{"status": "IN_QUEUE"}`
- **Keterangan:** Mengubah status order. Transisi harus valid (PAID -> IN_QUEUE -> IN_PRODUCTION -> DONE -> SHIPPED -> COMPLETED).

### Input Info Pengiriman (Admin)
- **URL:** `PATCH http://localhost:5000/api/admin/orders/:id/shipping`
- **Headers:** `Authorization: Bearer <admin_token>`
- **Body:**
  ```json
  {
    "shipping_tracking_number": "JNE123456789",
    "shipping_courier": "JNE"
  }
  ```
- **Keterangan:** Hanya bisa dilakukan jika status order `DONE` atau `SHIPPED`.

### Override Estimasi Selesai (Admin)
- **URL:** `PATCH http://localhost:5000/api/admin/orders/:id/estimation`
- **Headers:** `Authorization: Bearer <admin_token>`
- **Body:** `{"estimated_completion_date": "2025-06-10"}`
- **Keterangan:** Hanya bisa dilakukan jika status order `IN_QUEUE` atau `IN_PRODUCTION`.

---

## Common Error Codes

| Status | Pesan | Keterangan |
| :--- | :--- | :--- |
| **400** | `...wajib diisi` | Validasi gagal |
| **401** | `Unauthorized` | Token salah/habis |
| **403** | `Forbidden` | Bukan Admin |
| **404** | `Not Found` | Data tidak ada |

# Issue: Implementasi API Update Item Keranjang (PATCH)

## 1. Background & Tujuan

Fitur ini bertujuan untuk memungkinkan pengguna (Customer) memperbarui item yang sudah ada di dalam keranjang belanja mereka tanpa harus menghapus dan menambah ulang. Pengguna dapat mengubah jumlah (quantity) barang atau mengganti varian (rasa/ukuran) dari item tersebut.

Tujuan utama:

- Memberikan fleksibilitas kepada user untuk menyesuaikan pesanan di halaman keranjang.
- Memastikan integritas data (hanya bisa mengubah milik sendiri).
- Menangani konflik jika user mengubah varian ke varian yang sudah ada di keranjangnya.

## 2. Spesifikasi Teknis

- **Endpoint**: `PATCH /api/cart/items/:id`
- **Path Parameter**: `id` (ID dari CartItem yang ingin diubah).
- **Autentikasi**: Perlu (User Token via `apiRouter`).
- **Request Body (JSON)**:
  ```json
  {
    "variant_id": 1, // Opsional
    "quantity": 2 // Opsional
  }
  ```
- **Response Sukses (200 OK)**:
  ```json
  {
    "data": {
      "id": 1,
      "quantity": 2,
      "productVariant": {
        "id": 1,
        "price": 85000,
        "product": { "name": "Dark Chocolate Cookies" },
        "flavor": { "name": "Classic" },
        "size": { "name": "Medium Jar" }
      }
    }
  }
  ```
- **Response Error**:
  - `400 Bad Request`: Jika validasi gagal (misal quantity < 1).
  - `404 Not Found`: Jika item tidak ditemukan atau bukan milik user yang login.
  - `404 Not Found`: Jika `variant_id` baru tidak ditemukan di database.

## 3. Step-by-Step Implementasi

### Bagian A: Validasi

1. **File: `backend/src/validation/cart-validation.js`**
   - Buat skema baru bernama `updateItemCartValidation`.
   - Gunakan `z.object`.
   - Tambahkan `variant_id`: `z.number().positive().optional()`.
   - Tambahkan `quantity`: `z.number().min(1).optional()`.
   - Pastikan field bersifat **optional** agar user bisa mengirim salah satu saja.

### Bagian B: Service Logic

2. **File: `backend/src/services/cart-service.js`**
   - Buat fungsi `updateItem(userId, cartItemId, request)`.
   - **Langkah 1 (Validasi Input)**: Validasi `request` menggunakan `updateItemCartValidation.parse(request)`.
   - **Langkah 2 (Cek Eksistensi)**: Cari `CartItem` di database berdasarkan `id: cartItemId`.
     - _PENTING_: Lakukan `include` ke tabel `cart` untuk mengecek apakah `cart.userId` sama dengan `userId` dari parameter.
     - Jika tidak cocok atau tidak ada, lempar `ResponseError(404, "Item tidak ditemukan di dalam keranjang.")`.
   - **Langkah 3 (Validasi Varian Baru)**: Jika `variant_id` dikirim dalam request:
     - Cek apakah varian tersebut ada di database dan `isAvailable` adalah true.
     - Jika tidak tersedia, lempar error 400 atau 404 yang sesuai.
   - **Langkah 4 (Handle Duplikasi)**: Jika user mengubah `variant_id` ke varian yang SUDAH ADA di item lain di keranjang yang sama:
     - Cari apakah ada `CartItem` lain dengan `cartId` yang sama dan `productVariantId` tersebut.
     - Jika ada, tambahkan quantity item lama tersebut dengan quantity dari item yang sedang diupdate, lalu hapus item yang sedang diupdate ini.
     - Jika tidak ada duplikasi, lanjut ke update biasa.
   - **Langkah 5 (Database Update)**: Jalankan `prisma.cartItem.update`.
     - Update field `quantity` dan/atau `productVariantId` sesuai data yang dikirim.
     - Gunakan `include` yang lengkap (product, flavor, size) agar response sesuai spesifikasi.
   - **Langkah 6 (Return)**: Kembalikan data item yang sudah di-mapping sesuai format response.

### Bagian C: Controller

3. **File: `backend/src/controller/cart-controller.js`**
   - Buat fungsi `updateItem(req, res, next)`.
   - Ambil `userId` dari `req.user.id`.
   - Ambil `cartItemId` dari `req.params.id` (jangan lupa diubah ke integer).
   - Ambil data dari `req.body`.
   - Panggil `cartService.updateItem`.
   - Kirim response `res.status(200).json({ data: result })`.
   - Gunakan `try-catch` dan teruskan error ke `next(e)`.

### Bagian D: Routing

4. **File: `backend/src/routes/api.js`**
   - Daftarkan route baru di dalam `apiRouter`.
   - `apiRouter.patch("/api/cart/items/:id", cartController.updateItem);`.

### Bagian E: Dokumentasi & Testing

5. **File: `manual-test-api.md`**
   - Tambahkan dokumentasi untuk endpoint `PATCH /api/cart/items/:id`.
   - Berikan contoh request body dan response sukses.
6. **File: `backend/tests/cart.test.js`**
   - Tambahkan unit test untuk skenario:
     - Sukses update quantity.
     - Sukses update variant.
     - Error jika ID item tidak valid/milik orang lain.
     - Sukses "merge" item jika ganti varian ke yang sudah ada di keranjang.

## 4. Acceptance Criteria

- [ ] User berhasil mengubah quantity item di keranjang.
- [ ] User berhasil mengubah varian (rasa/ukuran) item di keranjang.
- [ ] Jika hanya mengirim quantity, `variant_id` tetap menggunakan data lama.
- [ ] Jika hanya mengirim `variant_id`, `quantity` tetap menggunakan data lama.
- [ ] User lain tidak bisa mengubah isi keranjang user yang sedang login (keamanan data).
- [ ] Response mengembalikan data item yang sudah diperbarui dengan detail produk lengkap.
- [ ] Muncul pesan error yang tepat jika item tidak ditemukan.
- [ ] Unit test lolos semua.

## 5. Catatan Implementasi (High Level)

Pastikan setiap query database yang melibatkan pencarian item keranjang selalu memverifikasi kepemilikan user (via `userId`). Jangan biarkan ada celah di mana user bisa menebak ID `CartItem` milik orang lain dan mengubah isinya.

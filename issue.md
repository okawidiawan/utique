# Feature: Implementasi API Alamat Pengiriman (Address)

## 1. Background & Tujuan
Fitur ini bertujuan untuk mengelola alamat pengiriman (multiple addresses) milik pengguna (customer). Alamat ini akan digunakan di halaman checkout untuk menghitung ongkir dan menentukan destinasi pengiriman pesanan.

Keamanan data (data isolation) harus diutamakan:
- Pengguna wajib terautentikasi (mempunyai token Bearer).
- Pengguna hanya boleh menambahkan, melihat, mengubah, dan menghapus alamat milik mereka sendiri.
- Pengguna tidak boleh mengakses atau memanipulasi alamat milik pengguna lain dengan cara apa pun (misalnya dengan mengganti `:id` di URL).

---

## 2. Spesifikasi Teknis

### Database Schema Reference (`Address`)
Berdasarkan `prisma.schema`, berikut adalah kolom tabel `addresses`:
- `id`: `Int` (Autoincrement, Primary Key)
- `userId`: `Int` (Foreign Key ke tabel `User`)
- `label`: `String` (Max 50, contoh: "Rumah", "Kantor")
- `recipientName`: `String` (Max 100)
- `phone`: `String` (Max 20)
- `province`: `String` (Max 100)
- `city`: `String` (Max 100)
- `district`: `String` (Max 100)
- `postalCode`: `String` (Max 10)
- `fullAddress`: `String` (Text)
- `isDefault`: `Boolean` (Default: `false`)
- `createdAt`: `DateTime`
- `updatedAt`: `DateTime`

### Endpoints & Flow

#### A. POST `/api/addresses` (Tambah Alamat)
- **Authentication**: Token Bearer (Wajib)
- **Request Body**:
  ```json
  {
    "label": "Rumah",
    "recipientName": "Budi Santoso",
    "phone": "081234567890",
    "province": "Jawa Timur",
    "city": "Surabaya",
    "district": "Gubeng",
    "postalCode": "60281",
    "fullAddress": "Jl. Kertajaya No. 123, RT 01 RW 02",
    "isDefault": true
  }
  ```
- **Response Success (201 Created atau 200 OK)**:
  ```json
  {
    "data": "OK"
  }
  ```
- **Response Error (400 Bad Request / 401 Unauthorized)**:
  - Validasi gagal: `{ "error": "Nama penerima wajib diisi." }`
  - Tidak terautentikasi: `{ "error": "Akses ditolak. Token tidak ditemukan." }`

#### B. GET `/api/addresses` (Ambil Daftar Alamat)
- **Authentication**: Token Bearer (Wajib)
- **Request Body**: None
- **Response Success (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": 1,
        "userId": 5,
        "label": "Rumah",
        "recipientName": "Budi Santoso",
        "phone": "081234567890",
        "province": "Jawa Timur",
        "city": "Surabaya",
        "district": "Gubeng",
        "postalCode": "60281",
        "fullAddress": "Jl. Kertajaya No. 123, RT 01 RW 02",
        "isDefault": true,
        "createdAt": "2026-05-28T00:00:00.000Z",
        "updatedAt": "2026-05-28T00:00:00.000Z"
      }
    ]
  }
  ```
- **Response Error (401 Unauthorized)**:
  - Tidak terautentikasi: `{ "error": "Akses ditolak. Token tidak ditemukan." }`

#### C. PATCH `/api/addresses/:id` (Ubah Alamat)
- **Authentication**: Token Bearer (Wajib)
- **URL Parameter**: `id` (Integer)
- **Request Body** (Partial Update / Opsional):
  ```json
  {
    "label": "Kantor",
    "isDefault": false
  }
  ```
- **Response Success (200 OK)**:
  ```json
  {
    "data": {
      "id": 1,
      "userId": 5,
      "label": "Kantor",
      "recipientName": "Budi Santoso",
      "phone": "081234567890",
      "province": "Jawa Timur",
      "city": "Surabaya",
      "district": "Gubeng",
      "postalCode": "60281",
      "fullAddress": "Jl. Kertajaya No. 123, RT 01 RW 02",
      "isDefault": false,
      "createdAt": "2026-05-28T00:00:00.000Z",
      "updatedAt": "2026-05-28T00:10:00.000Z"
    }
  }
  ```
- **Response Error (400 / 401 / 404)**:
  - Alamat tidak ada / milik user lain: `{ "error": "Alamat tidak ditemukan." }` (Status `404 Not Found`)
  - Validasi gagal: `{ "error": "Nomor telepon maksimal 20 karakter." }` (Status `400 Bad Request`)

#### D. DELETE `/api/addresses/:id` (Hapus Alamat)
- **Authentication**: Token Bearer (Wajib)
- **URL Parameter**: `id` (Integer)
- **Request Body**: None
- **Response Success (200 OK)**:
  ```json
  {
    "data": "OK"
  }
  ```
- **Response Error (401 / 404)**:
  - Alamat tidak ada / milik user lain: `{ "error": "Alamat tidak ditemukan." }` (Status `404 Not Found`)

---

## 3. Step-by-Step Implementasi Per File

### Langkah 1: Buat File Validasi Baru `backend/src/validation/address-validation.js`
1. Gunakan library Zod (`z`) untuk memvalidasi request body.
2. Buat skema `createAddressValidation` dengan ketentuan:
   - `label`: string, minimal 1, maksimal 50, error: "Label wajib diisi." / "Label maksimal 50 karakter."
   - `recipientName`: string, minimal 1, maksimal 100, error: "Nama penerima wajib diisi." / "Nama penerima maksimal 100 karakter."
   - `phone`: string, minimal 1, maksimal 20, error: "Nomor telepon wajib diisi." / "Nomor telepon maksimal 20 karakter."
   - `province`: string, minimal 1, maksimal 100, error: "Provinsi wajib diisi." / "Provinsi maksimal 100 karakter."
   - `city`: string, minimal 1, maksimal 100, error: "Kota wajib diisi." / "Kota maksimal 100 karakter."
   - `district`: string, minimal 1, maksimal 100, error: "Kecamatan wajib diisi." / "Kecamatan maksimal 100 karakter."
   - `postalCode`: string, minimal 1, maksimal 10, error: "Kode pos wajib diisi." / "Kode pos maksimal 10 karakter."
   - `fullAddress`: string, minimal 1, error: "Alamat lengkap wajib diisi."
   - `isDefault`: boolean, opsional (default: `false` di tingkat skema atau DB).
3. Buat skema `updateAddressValidation` dengan ketentuan field yang sama, namun buat seluruh field menjadi `.optional()`.
4. Export kedua skema tersebut.

### Langkah 2: Edit Layanan Pengguna `backend/src/services/user-service.js`
1. Import `createAddressValidation` dan `updateAddressValidation` dari `../validation/address-validation.js`.
2. Implementasikan function **`createAddress`**:
   - Signature: `const createAddress = async (userId, request) => { ... }`
   - Validasi parameter `request` menggunakan `createAddressValidation.parse(request)`.
   - **Logika Default Address**: Jika data alamat baru diset `isDefault: true`, lakukan update pada semua alamat milik user tersebut (`userId`) agar `isDefault: false` terlebih dahulu:
     ```javascript
     if (addressRequest.isDefault) {
       await prisma.address.updateMany({
         where: { userId, isDefault: true },
         data: { isDefault: false }
       });
     }
     ```
   - Lakukan penyimpanan alamat ke database:
     ```javascript
     await prisma.address.create({
       data: {
         ...addressRequest,
         userId: userId
       }
     });
     ```
   - Return string `"OK"`.
3. Implementasikan function **`listAddresses`**:
   - Signature: `const listAddresses = async (userId) => { ... }`
   - Ambil data semua alamat milik `userId` di database menggunakan `prisma.address.findMany` diurutkan berdasarkan `isDefault` desc (agar default address di atas) lalu `createdAt` desc.
   - Return array data alamat.
4. Implementasikan function **`updateAddress`**:
   - Signature: `const updateAddress = async (userId, addressId, request) => { ... }`
   - Validasi input menggunakan `updateAddressValidation.parse(request)`.
   - Periksa apakah alamat dengan `id: addressId` dan `userId: userId` terdaftar. Jika tidak ada, lempar `ResponseError(404, "Alamat tidak ditemukan.")`.
   - **Logika Default Address**: Jika input di-update menjadi `isDefault: true`, nonaktifkan `isDefault` pada alamat lain milik user tersebut.
   - Update alamat menggunakan `prisma.address.update` dengan filter `where: { id: addressId }`.
   - Return data alamat yang berhasil diperbarui.
5. Implementasikan function **`deleteAddress`**:
   - Signature: `const deleteAddress = async (userId, addressId) => { ... }`
   - Periksa apakah alamat dengan `id: addressId` dan `userId: userId` terdaftar. Jika tidak ada, lempar `ResponseError(404, "Alamat tidak ditemukan.")`.
   - Hapus alamat menggunakan `prisma.address.delete` dengan filter `where: { id: addressId }`.
   - Return string `"OK"`.
6. Daftarkan dan export fungsi-fungsi baru tersebut pada `export default { ..., createAddress, listAddresses, updateAddress, deleteAddress }`.

### Langkah 3: Edit Controller `backend/src/controller/user-controller.js`
1. Tambahkan fungsi handler berikut:
   - **`createAddress`**:
     ```javascript
     const createAddress = async (req, res, next) => {
       try {
         const userId = req.user.id;
         const result = await userService.createAddress(userId, req.body);
         res.status(201).json({ data: result });
       } catch (e) {
         next(e);
       }
     };
     ```
   - **`listAddresses`**:
     ```javascript
     const listAddresses = async (req, res, next) => {
       try {
         const userId = req.user.id;
         const result = await userService.listAddresses(userId);
         res.status(200).json({ data: result });
       } catch (e) {
         next(e);
       }
     };
     ```
   - **`updateAddress`**:
     ```javascript
     const updateAddress = async (req, res, next) => {
       try {
         const userId = req.user.id;
         const addressId = parseInt(req.params.id);
         const result = await userService.updateAddress(userId, addressId, req.body);
         res.status(200).json({ data: result });
       } catch (e) {
         next(e);
       }
     };
     ```
   - **`deleteAddress`**:
     ```javascript
     const deleteAddress = async (req, res, next) => {
       try {
         const userId = req.user.id;
         const addressId = parseInt(req.params.id);
         const result = await userService.deleteAddress(userId, addressId);
         res.status(200).json({ data: result });
       } catch (e) {
         next(e);
       }
     };
     ```
2. Daftarkan dan export handler ini di `export default { ..., createAddress, listAddresses, updateAddress, deleteAddress }`.

### Langkah 4: Edit Router `backend/src/routes/api.js`
1. Daftarkan endpoint-endpoint alamat pada area `// Address Routes` di dalam `apiRouter` (yang menggunakan `authMiddleware`):
   ```javascript
   apiRouter.post("/api/addresses", userController.createAddress);
   apiRouter.get("/api/addresses", userController.listAddresses);
   apiRouter.patch("/api/addresses/:id", userController.updateAddress);
   apiRouter.delete("/api/addresses/:id", userController.deleteAddress);
   ```

### Langkah 5: Edit Test Utility `backend/tests/test-util.js`
1. Buat helper untuk menghapus semua data alamat:
   ```javascript
   export const removeTestAddresses = async () => {
     await prisma.address.deleteMany({});
   };
   ```
2. Buat helper untuk membuat alamat uji coba:
   ```javascript
   export const createTestAddress = async (userId, customData = {}) => {
     return prisma.address.create({
       data: {
         userId,
         label: "Rumah Test",
         recipientName: "Penerima Test",
         phone: "081234567890",
         province: "Provinsi Test",
         city: "Kota Test",
         district: "Kecamatan Test",
         postalCode: "12345",
         fullAddress: "Alamat Lengkap Test",
         isDefault: false,
         ...customData
       }
     });
   };
   ```
3. Export kedua helper ini.

### Langkah 6: Tambahkan Unit Test di `backend/tests/user.test.js`
1. Pastikan import `removeTestAddresses` dan `createTestAddress` ditambahkan dari `./test-util.js`.
2. Di dalam hook `beforeEach` dan `afterEach` yang ada, pastikan juga memanggil `await removeTestAddresses()`.
3. Buat blok test baru `describe("Address API", () => { ... })` di dalam suite `User API`.
4. Implementasikan test case berikut:
   - **POST `/api/addresses`**:
     - Berhasil menambahkan alamat baru dengan token valid (kembalian `201` atau `200` dengan `{ data: "OK" }`).
     - Gagal jika token tidak dikirim / tidak valid (`401 unauthorized`).
     - Gagal jika validasi request body tidak terpenuhi (`400 Bad Request` dengan pesan error bahasa Indonesia, misal "Nama penerima wajib diisi.").
     - Logika `isDefault` bekerja (jika alamat baru `isDefault: true`, alamat lama milik user yang sama harus otomatis menjadi `isDefault: false`).
   - **GET `/api/addresses`**:
     - Berhasil mengambil daftar alamat milik user yang login.
     - Hanya menampilkan alamat milik user tersebut (data isolation), tidak boleh ada alamat milik user lain yang bocor di response.
     - Gagal jika token tidak valid (`401 unauthorized`).
   - **PATCH `/api/addresses/:id`**:
     - Berhasil memperbarui alamat milik sendiri (kembalian `200` dengan data yang diupdate).
     - Gagal jika mencoba memperbarui alamat milik user lain (kembalian `404 Alamat tidak ditemukan.`).
     - Gagal jika alamat tidak terdaftar (`404 Alamat tidak ditemukan.`).
     - Gagal jika validasi body tidak sesuai (`400 Bad Request`).
   - **DELETE `/api/addresses/:id`**:
     - Berhasil menghapus alamat milik sendiri (kembalian `200` dengan `{ data: "OK" }`).
     - Gagal jika mencoba menghapus alamat milik user lain (kembalian `404 Alamat tidak ditemukan.`).
     - Gagal jika alamat tidak terdaftar (`404 Alamat tidak ditemukan.`).

---

## 4. Acceptance Criteria

- [ ] **Auth Enforcement**: Semua API (`POST`, `GET`, `PATCH`, `DELETE`) pada path `/api/addresses` menolak request tanpa token Bearer yang valid dengan status code `401` dan error message sesuai middleware.
- [ ] **Data Isolation (Security)**:
  - [ ] `GET /api/addresses` hanya menampilkan data alamat milik user yang login (tidak boleh menampilkan milik user lain).
  - [ ] `PATCH /api/addresses/:id` mengembalikan `404` (Alamat tidak ditemukan.) jika `:id` yang dikirim adalah milik user lain.
  - [ ] `DELETE /api/addresses/:id` mengembalikan `404` (Alamat tidak ditemukan.) jika `:id` yang dikirim adalah milik user lain.
- [ ] **Validasi Request**:
  - [ ] Input data alamat di-parse oleh Zod schema.
  - [ ] Jika field wajib tidak terisi atau panjang karakter melanggar batasan, kembalikan status `400` dengan pesan error Bahasa Indonesia.
- [ ] **Default Address Toggle**:
  - [ ] Jika alamat baru diset `isDefault: true`, semua alamat lain milik user tersebut berubah menjadi `isDefault: false` secara otomatis.
- [ ] **Success Response Format**:
  - [ ] `POST /api/addresses` mengembalikan format `{ "data": "OK" }`.
  - [ ] `DELETE /api/addresses/:id` mengembalikan format `{ "data": "OK" }`.
  - [ ] `GET /api/addresses` mengembalikan format `{ "data": [...] }`.
  - [ ] `PATCH /api/addresses/:id` mengembalikan format `{ "data": { ... } }` berisi object alamat terbaru.
- [ ] **Unit Tests**:
  - [ ] Semua skenario pengujian di `tests/user.test.js` berjalan sukses tanpa error dengan command testing yang digunakan proyek (`bun test tests/user.test.js` atau sejenisnya).

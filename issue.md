# Feature: Implementasi API Auth & User

## Deskripsi

Implementasi seluruh endpoint Auth & User sebagai fondasi sistem autentikasi project Utique. Issue ini mencakup 5 endpoint: registrasi, login, get profil, update profil, dan logout. Semua fitur lain (cart, order, address, dll) bergantung pada sistem ini.

---

## Konteks

### Infrastruktur yang Sudah Tersedia

- **Prisma Schema**: Model `User` sudah didefinisikan di `backend/prisma/schema.prisma` dengan field `id`, `name`, `email`, `password`, `phone`, `role`, `token`, `createdAt`, `updatedAt`.
- **Database**: PostgreSQL `utique_db` sudah tersedia dan tersinkronisasi.
- **Auth Middleware**: `auth-middleware.js` sudah tersedia — memvalidasi Bearer token dari header `Authorization` dan menyimpan data user di `req.user`.
- **Error Handling**: `ResponseError` class dan `error-middleware.js` sudah tersedia.
- **Router**: 3 router sudah tersedia:
  - `public-api.js` — untuk endpoint tanpa autentikasi (register, login)
  - `api.js` — untuk endpoint yang membutuhkan token (get/update profil, logout)
  - `admin-api.js` — untuk endpoint admin
- **Dependencies**: `bcrypt`, `uuid`, `zod` sudah terinstall di `package.json`.

### Konvensi yang Harus Diikuti (dari CONTEXT.md)

- **Arsitektur**: `Router → Controller → Service → Prisma`
- **Validasi**: Di layer Service menggunakan Zod, pesan error dalam **Bahasa Indonesia**
- **Response Format**: Sukses `{ data: ... }`, Error `{ error: "..." }`
- **Error Handling**: `try...catch` di Controller, teruskan ke `next(e)`
- **Naming**: File `kebab-case.js`, variabel `camelCase`, skema Zod `[aksi][Domain]Validation`
- **Dokumentasi**: Komentar Bahasa Indonesia di setiap function
- **Auth**: Stateless — token disimpan di field `token` tabel User, divalidasi via header `Authorization: Bearer <token>`

---

## Endpoint yang Diimplementasi

### 1. `POST /api/users` — Registrasi Akun Baru

**Router**: `public-api.js` (tanpa autentikasi)

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "rahasia123",
  "phone": "081234567890"  // opsional
}
```

**Validasi (Zod):**

| Field | Aturan | Pesan Error |
|---|---|---|
| `name` | Wajib, string, min 1, maks 100 karakter | `"Nama wajib diisi."`, `"Nama maksimal 100 karakter."` |
| `email` | Wajib, format email valid, maks 100 karakter | `"Email wajib diisi."`, `"Format email tidak valid."` |
| `password` | Wajib, min 6 karakter, maks 100 karakter | `"Password wajib diisi."`, `"Password minimal 6 karakter."` |
| `phone` | Opsional, maks 20 karakter | `"Nomor telepon maksimal 20 karakter."` |

**Logika Service:**

1. Validasi input menggunakan Zod
2. Cek apakah email sudah terdaftar → jika ya, throw `ResponseError(400, "Email sudah terdaftar.")`
3. Hash password menggunakan `bcrypt` (salt round: 10)
4. Buat user baru di database dengan role default `CUSTOMER`
5. Return data user (tanpa password dan token)

**Response Sukses (201):**

```json
{
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "081234567890",
    "role": "CUSTOMER",
    "createdAt": "2026-05-07T10:00:00.000Z"
  }
}
```

**Response Error:**

| Status | Kondisi | Response |
|---|---|---|
| 400 | Validasi gagal | `{ "error": "Nama wajib diisi., Email wajib diisi." }` |
| 400 | Email sudah terdaftar | `{ "error": "Email sudah terdaftar." }` |

---

### 2. `POST /api/users/login` — Login

**Router**: `public-api.js` (tanpa autentikasi)

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "rahasia123"
}
```

**Validasi (Zod):**

| Field | Aturan | Pesan Error |
|---|---|---|
| `email` | Wajib, format email valid, maks 100 karakter | `"Email wajib diisi."`, `"Format email tidak valid."` |
| `password` | Wajib, min 1 karakter, maks 100 karakter | `"Password wajib diisi."` |

**Logika Service:**

1. Validasi input menggunakan Zod
2. Cari user berdasarkan email → jika tidak ditemukan, throw `ResponseError(401, "Email atau password salah.")`
3. Bandingkan password dengan `bcrypt.compare()` → jika tidak cocok, throw `ResponseError(401, "Email atau password salah.")`
4. Generate token menggunakan `uuid.v4()`
5. Simpan token di field `token` pada tabel User
6. Return data user beserta token

**Response Sukses (200):**

```json
{
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "081234567890",
    "role": "CUSTOMER",
    "token": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Response Error:**

| Status | Kondisi | Response |
|---|---|---|
| 400 | Validasi gagal | `{ "error": "Email wajib diisi., Password wajib diisi." }` |
| 401 | Email tidak ditemukan | `{ "error": "Email atau password salah." }` |
| 401 | Password salah | `{ "error": "Email atau password salah." }` |

> **Catatan**: Pesan error login harus generik ("Email atau password salah.") — tidak boleh membedakan apakah email yang salah atau password yang salah, untuk mencegah user enumeration.

---

### 3. `GET /api/users/current` — Mengambil Profil User

**Router**: `api.js` (membutuhkan autentikasi)

**Request**: Tidak ada body. User diidentifikasi dari `req.user` yang di-set oleh `auth-middleware.js`.

**Logika Service:**

1. Ambil data user dari database berdasarkan `req.user.id`
2. Return data user (tanpa password dan token)

**Response Sukses (200):**

```json
{
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "081234567890",
    "role": "CUSTOMER",
    "createdAt": "2026-05-07T10:00:00.000Z",
    "updatedAt": "2026-05-07T10:00:00.000Z"
  }
}
```

**Response Error:**

| Status | Kondisi | Response |
|---|---|---|
| 401 | Token tidak ada / tidak valid | `{ "error": "Akses ditolak. Token tidak valid atau sudah expired." }` |

---

### 4. `PATCH /api/users/current` — Memperbarui Profil User

**Router**: `api.js` (membutuhkan autentikasi)

**Request Body** (semua field opsional, minimal 1 harus diisi):

```json
{
  "name": "John Updated",
  "email": "john.new@example.com",
  "password": "newpassword123",
  "phone": "089876543210"
}
```

**Validasi (Zod):**

| Field | Aturan | Pesan Error |
|---|---|---|
| `name` | Opsional, min 1, maks 100 karakter | `"Nama minimal 1 karakter."`, `"Nama maksimal 100 karakter."` |
| `email` | Opsional, format email valid, maks 100 karakter | `"Format email tidak valid."` |
| `password` | Opsional, min 6 karakter, maks 100 karakter | `"Password minimal 6 karakter."` |
| `phone` | Opsional, maks 20 karakter | `"Nomor telepon maksimal 20 karakter."` |

**Logika Service:**

1. Validasi input menggunakan Zod
2. Jika tidak ada field yang diisi, throw `ResponseError(400, "Minimal satu field harus diisi untuk update.")`
3. Jika email diubah, cek apakah email baru sudah digunakan user lain → jika ya, throw `ResponseError(400, "Email sudah digunakan.")`
4. Jika password diubah, hash password baru dengan `bcrypt`
5. Update data user di database
6. Return data user yang sudah diupdate (tanpa password dan token)

**Response Sukses (200):**

```json
{
  "data": {
    "id": 1,
    "name": "John Updated",
    "email": "john.new@example.com",
    "phone": "089876543210",
    "role": "CUSTOMER",
    "createdAt": "2026-05-07T10:00:00.000Z",
    "updatedAt": "2026-05-07T12:00:00.000Z"
  }
}
```

**Response Error:**

| Status | Kondisi | Response |
|---|---|---|
| 400 | Validasi gagal | `{ "error": "..." }` |
| 400 | Tidak ada field yang diisi | `{ "error": "Minimal satu field harus diisi untuk update." }` |
| 400 | Email sudah digunakan user lain | `{ "error": "Email sudah digunakan." }` |
| 401 | Token tidak valid | `{ "error": "Akses ditolak. Token tidak valid atau sudah expired." }` |

---

### 5. `DELETE /api/users/logout` — Logout

**Router**: `api.js` (membutuhkan autentikasi)

**Request**: Tidak ada body. User diidentifikasi dari `req.user`.

**Logika Service:**

1. Set field `token` pada user menjadi `null`
2. Return pesan sukses

**Response Sukses (200):**

```json
{
  "data": "Berhasil logout."
}
```

**Response Error:**

| Status | Kondisi | Response |
|---|---|---|
| 401 | Token tidak valid | `{ "error": "Akses ditolak. Token tidak valid atau sudah expired." }` |

---

## File yang Harus Dibuat/Dimodifikasi

### File Baru

| File | Deskripsi |
|---|---|
| `src/validation/user-validation.js` | Skema Zod: `registerUserValidation`, `loginUserValidation`, `updateUserValidation` |
| `src/services/user-service.js` | Logika bisnis: `register()`, `login()`, `get()`, `update()`, `logout()` |
| `src/controller/user-controller.js` | Handler HTTP: `register()`, `login()`, `get()`, `update()`, `logout()` |
| `tests/user.test.js` | Unit test untuk semua 5 endpoint |

### File yang Dimodifikasi

| File | Perubahan |
|---|---|
| `src/routes/public-api.js` | Tambah route `POST /api/users` dan `POST /api/users/login` |
| `src/routes/api.js` | Tambah route `GET /api/users/current`, `PATCH /api/users/current`, `DELETE /api/users/logout` |

---

## Detail Implementasi per File

### `src/validation/user-validation.js`

```javascript
// Skema validasi yang diekspor:
export const registerUserValidation = z.object({ ... });
export const loginUserValidation = z.object({ ... });
export const updateUserValidation = z.object({ ... });
```

### `src/services/user-service.js`

```javascript
// Method yang diekspor:
const register = async (request) => { ... };
const login = async (request) => { ... };
const get = async (userId) => { ... };
const update = async (userId, request) => { ... };
const logout = async (userId) => { ... };

export default { register, login, get, update, logout };
```

### `src/controller/user-controller.js`

```javascript
// Semua handler menggunakan pola try...catch + next(e)
const register = async (req, res, next) => { ... };
const login = async (req, res, next) => { ... };
const get = async (req, res, next) => { ... };
const update = async (req, res, next) => { ... };
const logout = async (req, res, next) => { ... };

export default { register, login, get, update, logout };
```

---

## Unit Test

### Skenario Test yang Harus Dicover

#### Register — `POST /api/users`
- [ ] Berhasil registrasi dengan data lengkap
- [ ] Berhasil registrasi tanpa phone (opsional)
- [ ] Gagal jika name kosong
- [ ] Gagal jika email tidak valid
- [ ] Gagal jika password kurang dari 6 karakter
- [ ] Gagal jika email sudah terdaftar

#### Login — `POST /api/users/login`
- [ ] Berhasil login dengan kredensial benar
- [ ] Gagal jika email tidak terdaftar
- [ ] Gagal jika password salah
- [ ] Gagal jika email kosong
- [ ] Gagal jika password kosong

#### Get Current User — `GET /api/users/current`
- [ ] Berhasil mendapatkan profil user
- [ ] Gagal jika tidak ada token (401)
- [ ] Gagal jika token tidak valid (401)

#### Update User — `PATCH /api/users/current`
- [ ] Berhasil update nama
- [ ] Berhasil update email
- [ ] Berhasil update password
- [ ] Berhasil update phone
- [ ] Berhasil update multiple field sekaligus
- [ ] Gagal jika tidak ada field yang diisi
- [ ] Gagal jika email baru sudah digunakan user lain
- [ ] Gagal jika token tidak valid (401)

#### Logout — `DELETE /api/users/logout`
- [ ] Berhasil logout (token menjadi null)
- [ ] Gagal jika token tidak valid (401)
- [ ] Token yang sudah di-logout tidak bisa digunakan lagi

---

## Catatan Penting

1. **Password Security**: Password di-hash menggunakan `bcrypt` dengan salt round 10. Password **tidak boleh** dikembalikan di response manapun.
2. **Token Security**: Token di-generate menggunakan `uuid.v4()`. Token **tidak boleh** dikembalikan di response get/update profil — hanya di response login.
3. **User Enumeration Prevention**: Pesan error login harus generik ("Email atau password salah."), tidak membedakan apakah email atau password yang salah.
4. **Data Isolation**: Semua query profil user menggunakan `user.id` dari `req.user` (yang sudah divalidasi oleh auth middleware).

---

## Referensi

- CONTEXT.md: `CONTEXT.md`
- Prisma Schema (User model): `backend/prisma/schema.prisma` (baris 43-60)
- Auth Middleware: `backend/src/middleware/auth-middleware.js`
- Error Middleware: `backend/src/error/error-middleware.js`
- ResponseError Class: `backend/src/error/response-error.js`
- Public Router: `backend/src/routes/public-api.js`
- API Router: `backend/src/routes/api.js`

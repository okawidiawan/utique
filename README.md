# 🍪 Utique

Toko cookies online berbasis pre-order.

**Utique** — diambil dari nama **Utik** (nama ibu) + **Que** (kue).

## Tech Stack

| Layer | Teknologi |
|---|---|
| Runtime | Node.js / Bun |
| Frontend | React.js (Vite) |
| Backend | Express.js |
| ORM | Prisma |
| Database | PostgreSQL |
| File Storage | Cloudinary |
| Email | Nodemailer + Gmail SMTP |

## Cara Menjalankan

### Backend

```bash
cd backend
cp .env.example .env    # Sesuaikan DATABASE_URL
bun install             # atau npm install
npx prisma generate
npx prisma db push
bun run dev             # atau npm run dev → http://localhost:5000
```

### Frontend

```bash
cd frontend
bun install             # atau npm install
bun run dev             # atau npm run dev → http://localhost:5173
```

## Dokumentasi

- [CONTEXT.md](./CONTEXT.md) — Konteks teknis & arsitektur project

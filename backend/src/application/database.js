import { PrismaClient } from "@prisma/client";

// Inisialisasi Prisma Client dengan logging di mode development
export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "info", "warn", "error"]
      : ["error"],
});

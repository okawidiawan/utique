import { prisma } from "../src/application/database.js";
import bcrypt from "bcrypt";

export const removeTestUser = async () => {
  await prisma.user.deleteMany({});
};

export const createTestUser = async () => {
  await prisma.user.create({
    data: {
      name: "Test User",
      email: "test@example.com",
      password: await bcrypt.hash("rahasia123", 10),
      token: "test-token",
    },
  });
};

export const getTestUser = async () => {
  return prisma.user.findUnique({
    where: {
      email: "test@example.com",
    },
  });
};

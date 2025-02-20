
import { PrismaClient } from "@prisma/client";
import { env } from "../../../lib/env/index.ts";

export type DB = PrismaClient;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query", "error", "warn"] 
  });

globalForPrisma.prisma = prisma;
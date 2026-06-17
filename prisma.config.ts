// Prisma 7 config. URLs de conexão ficam aqui (não mais no schema).
// Migrations usam a conexão DIRETA (sem pooler) do Neon.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL_UNPOOLED"],
  },
});

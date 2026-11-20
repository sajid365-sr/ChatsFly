import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema/",
  datasource: {
    // Prisma 7's `defineConfig` no longer accepts `directUrl` — the CLI uses this
    // single URL, while the app itself connects through its own driver adapter
    // (see lib/core/db.ts). Fallback allows `prisma generate` to succeed in Docker build.
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/chatsfly",
  },
  migrations: {
    seed: "npx tsx scripts/seed-platforms.ts",
  },
});

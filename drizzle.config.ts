import { defineConfig } from "drizzle-kit";
export default defineConfig({ schema:"./app/lib/schema.server.ts", out:"./drizzle", dialect:"postgresql", dbCredentials:{url:process.env.DATABASE_URL??"postgresql://greensign:greensign@localhost:5432/greensign"} });

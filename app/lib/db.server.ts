import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.server";

let client: ReturnType<typeof postgres> | undefined;
export function getDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for database operations");
  client ??= postgres(url, { max: 10 });
  return drizzle(client, { schema });
}

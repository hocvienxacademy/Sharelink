import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import { readSchemaFingerprint } from "./schema-fingerprint";

loadEnv({ path: ".env", override: false, quiet: true });
const connectionString =
  process.env.SOURCE_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("SOURCE_DATABASE_URL is required.");

const client = new Client({
  connectionString,
  application_name: "share-link-student-schema-fingerprint",
  options: "-c default_transaction_read_only=on",
});
await client.connect();
try {
  console.log(await readSchemaFingerprint(client));
} finally {
  await client.end();
}

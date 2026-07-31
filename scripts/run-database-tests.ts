import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import {
  prepareTestDatabase,
  requireSafeTestDatabase,
} from "../tests/helpers/test-database";

loadEnv({ path: ".env", override: false, quiet: true });

const target = requireSafeTestDatabase();
const developmentDatabaseUrl = process.env.DATABASE_URL;
await prepareTestDatabase();

const testFiles = readdirSync(path.resolve("tests/integration"), {
  recursive: true,
  withFileTypes: true,
})
  .filter((entry) => entry.isFile() && entry.name.endsWith(".test.ts"))
  .map((entry) => path.join(entry.parentPath, entry.name))
  .sort();

if (testFiles.length === 0) {
  throw new Error("No integration test files were found.");
}

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", "--test-concurrency=1", ...testFiles],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: target.url,
      ...(developmentDatabaseUrl
        ? { DEVELOPMENT_DATABASE_URL: developmentDatabaseUrl }
        : {}),
      NODE_ENV: "test",
    },
    stdio: "inherit",
  },
);

process.exit(result.status ?? 1);

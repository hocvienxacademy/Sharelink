import { spawn, spawnSync } from "node:child_process";
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

const sharedEnvironment = {
  ...process.env,
  DATABASE_URL: target.url,
  ...(developmentDatabaseUrl
    ? { DEVELOPMENT_DATABASE_URL: developmentDatabaseUrl }
    : {}),
};

async function waitForServer(url: string): Promise<void> {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${url}.`);
}

const build = spawnSync(
  process.execPath,
  [path.resolve("node_modules/next/dist/bin/next"), "build"],
  {
  cwd: process.cwd(),
  env: { ...sharedEnvironment, NODE_ENV: "production" },
  stdio: "inherit",
  },
);

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const server = spawn(
  process.execPath,
  [
    path.resolve("node_modules/next/dist/bin/next"),
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3100",
  ],
  {
    cwd: process.cwd(),
    env: { ...sharedEnvironment, NODE_ENV: "production" },
    stdio: "inherit",
  },
);

let status = 1;

try {
  await waitForServer("http://127.0.0.1:3100");
  const playwright = spawnSync(
    process.execPath,
    [path.resolve("node_modules/@playwright/test/cli.js"), "test"],
    {
      cwd: process.cwd(),
      env: {
        ...sharedEnvironment,
        E2E_EXTERNAL_SERVER: "1",
        NODE_ENV: "test",
      },
      stdio: "inherit",
    },
  );
  status = playwright.status ?? 1;
} finally {
  if (server.pid !== undefined && process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  } else {
    server.kill("SIGTERM");
  }
}

process.exit(status);

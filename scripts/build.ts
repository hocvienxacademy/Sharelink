import { spawnSync } from "node:child_process";
import path from "node:path";

const result = spawnSync(
  process.execPath,
  [path.resolve("node_modules/next/dist/bin/next"), "build"],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      APP_ENV: "build",
      SHARE_LINK_BUILD_PHASE: "1",
    },
    stdio: "inherit",
  },
);
process.exit(result.status ?? 1);

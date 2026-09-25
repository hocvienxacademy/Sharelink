import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  createVietnameseWardDataset,
  VIETNAMESE_WARDS_SOURCE_URL,
} from "../src/shared/administrative-divisions/vietnamese-wards-dataset";

const OUTPUT_PATH = path.resolve(
  process.cwd(),
  "src/shared/administrative-divisions/data/vietnamese-wards.json",
);
const MAX_ATTEMPTS = 3;

async function downloadAdministrativeDivisions() {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(VIETNAMESE_WARDS_SOURCE_URL, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        throw new Error(`API trả về HTTP ${response.status}.`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;

      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
      }
    }
  }

  throw lastError;
}

async function main() {
  const upstreamPayload = await downloadAdministrativeDivisions();
  const dataset = createVietnameseWardDataset(upstreamPayload);
  const wardCount = dataset.provinces.reduce(
    (total, province) => total + province.wards.length,
    0,
  );

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

  console.log(
    `Đã cập nhật ${dataset.provinces.length} tỉnh/thành và ${wardCount} xã/phường.`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Không thể cập nhật dữ liệu xã/phường: ${message}`);
  process.exitCode = 1;
});

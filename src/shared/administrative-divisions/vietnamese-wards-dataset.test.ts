import assert from "node:assert/strict";
import test from "node:test";

import { VIETNAMESE_PROVINCES } from "./vietnamese-provinces";
import {
  createVietnameseWardDataset,
  parseVietnameseWardDataset,
} from "./vietnamese-wards-dataset";

function createCompleteUpstreamPayload() {
  return VIETNAMESE_PROVINCES.map((province, index) => ({
    code: province.code,
    name: province.name,
    wards: [
      {
        code: 10_000 + index,
        name: `Xã thử nghiệm ${index}`,
      },
    ],
  }));
}

test("normalizes a complete upstream payload into a deterministic dataset", () => {
  const dataset = createVietnameseWardDataset(createCompleteUpstreamPayload());

  assert.equal(dataset.provinces.length, VIETNAMESE_PROVINCES.length);
  assert.deepEqual(
    dataset.provinces.map((province) => province.code),
    dataset.provinces.map((province) => province.code).toSorted((a, b) => a - b),
  );
  assert.doesNotThrow(() => parseVietnameseWardDataset(dataset));
});

test("rejects an update when a configured province is missing", () => {
  const payload = createCompleteUpstreamPayload();
  payload.pop();

  assert.throws(
    () => createVietnameseWardDataset(payload),
    /Danh sách tỉnh\/thành không khớp cấu hình/,
  );
});

test("rejects duplicate wards within a province", () => {
  const payload = createCompleteUpstreamPayload();
  const firstProvince = payload[0];
  assert.ok(firstProvince);
  const firstWard = firstProvince.wards[0];
  assert.ok(firstWard);

  firstProvince.wards.push({
    code: firstWard.code + 1,
    name: firstWard.name,
  });

  assert.throws(
    () => createVietnameseWardDataset(payload),
    /chứa xã\/phường bị trùng mã hoặc tên/,
  );
});

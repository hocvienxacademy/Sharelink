import assert from "node:assert/strict";
import test from "node:test";

import { fetchVietnameseWards } from "./vietnamese-wards";

test("loads wards from the bundled dataset in Vietnamese alphabetical order", async () => {
  const wards = await fetchVietnameseWards(86);

  assert.ok(wards.length > 0);
  assert.deepEqual(
    wards.map((ward) => ward.name),
    wards.map((ward) => ward.name).toSorted((left, right) =>
      left.localeCompare(right, "vi"),
    ),
  );
});

test("rejects an unknown province code without calling an external API", async () => {
  await assert.rejects(
    () => fetchVietnameseWards(999),
    /Mã tỉnh\/thành phố không hợp lệ/,
  );
});

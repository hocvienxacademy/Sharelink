import assert from "node:assert/strict";
import { test } from "node:test";
import { searchLocalAddresses } from "./local-address-autocomplete";

test("keeps the typed street and completes the ward and province", async () => {
  const suggestions = await searchLocalAddresses("126 Nguyễn Thiện Thành, Long Đức");

  assert.deepEqual(suggestions[0], {
    value: "126 Nguyễn Thiện Thành, Phường Long Đức, Tỉnh Vĩnh Long",
    label: "126 Nguyễn Thiện Thành, Phường Long Đức, Tỉnh Vĩnh Long",
  });
});

test("matches without Vietnamese diacritics and returns every province with that ward name", async () => {
  const values = (await searchLocalAddresses("hoa thuan")).map((suggestion) => suggestion.value);

  assert.ok(values.includes("Phường Hòa Thuận, Tỉnh Vĩnh Long"));
  assert.ok(values.includes("Xã Hòa Thuận, Tỉnh An Giang"));
});

test("accepts a division prefix in the search term", async () => {
  const values = (await searchLocalAddresses("Ấp 3, đặc khu Côn Đảo")).map((suggestion) => suggestion.value);

  assert.deepEqual(values, ["Ấp 3, Đặc khu Côn Đảo, Thành phố Hồ Chí Minh"]);
});

test("returns at most ten suggestions and nothing for a too-short ward term", async () => {
  assert.ok((await searchLocalAddresses("Phường")).length <= 10);
  assert.deepEqual(await searchLocalAddresses("12 Lê Lợi, P"), []);
});

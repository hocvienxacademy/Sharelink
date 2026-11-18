import assert from "node:assert/strict";
import { test } from "node:test";
import administrativeUnits from "./data/vietnam-administrative-units.json";
import { VIETNAMESE_PROVINCES } from "./vietnamese-provinces";
import {
  listVietnameseAdministrativeProvinces,
  listVietnameseWards,
} from "./vietnamese-wards";

test("bundled administrative data covers the 34 post-2025 provinces and 3,321 commune-level units", () => {
  const provinces = listVietnameseAdministrativeProvinces();
  const wardCount = provinces.reduce((total, province) => total + province.wards.length, 0);

  assert.equal(provinces.length, 34);
  assert.equal(administrativeUnits.provinceCount, 34);
  assert.equal(wardCount, 3_321);
  assert.equal(administrativeUnits.wardCount, wardCount);
});

test("bundled provinces match the selectable province list by code and name", () => {
  const dataProvinces = new Map(
    listVietnameseAdministrativeProvinces().map((province) => [province.code, province.name]),
  );

  assert.equal(dataProvinces.size, VIETNAMESE_PROVINCES.length);
  for (const province of VIETNAMESE_PROVINCES) {
    assert.equal(dataProvinces.get(province.code), province.name);
  }
});

test("ward names are unique and non-empty within each province", () => {
  for (const province of listVietnameseAdministrativeProvinces()) {
    const names = province.wards.map((ward) => ward.name);
    assert.ok(names.every((name) => name.trim().length > 0 && name.trim() === name));
    assert.equal(new Set(names).size, names.length, province.name);
  }
});

test("lists wards of a province from bundled data", async () => {
  const wards = await listVietnameseWards(86);

  assert.ok(wards.some((ward) => ward.name === "Phường Trà Vinh"));
});

test("rejects an unknown province code", async () => {
  await assert.rejects(listVietnameseWards(999), { name: "BadRequestError" });
});

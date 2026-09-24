import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseStaffApplicationListFilter } from "./staff-application-list-filter";

const NOW = new Date("2026-09-24T05:00:00.000Z");

describe("parseStaffApplicationListFilter", () => {
  it("trims a name or phone search while preserving Vietnamese text", () => {
    const result = parseStaffApplicationListFilter({ q: "  Nguyễn Huỳnh  " }, NOW);
    assert.equal(result.search, "Nguyễn Huỳnh");
    assert.equal(result.state.search, "  Nguyễn Huỳnh  ");
    assert.equal(result.error, undefined);
  });

  it("rejects a search longer than the student name column", () => {
    const result = parseStaffApplicationListFilter({ q: "x".repeat(151) }, NOW);
    assert.equal(result.search, undefined);
    assert.match(result.error ?? "", /150 ký tự/u);
  });

  it("parses an application status filter", () => {
    const result = parseStaffApplicationListFilter({ filterField: "status", filterValue: "SUBMITTED" }, NOW);
    assert.deepEqual(result.filter, { kind: "status", value: "SUBMITTED" });
    assert.equal(result.error, undefined);
  });

  it("rejects an unknown filter value", () => {
    const result = parseStaffApplicationListFilter({ filterField: "fee", filterValue: "UNKNOWN" }, NOW);
    assert.equal(result.filter, undefined);
    assert.match(result.error ?? "", /lệ phí/u);
  });

  it("uses Monday through Sunday for the current week in Vietnam time", () => {
    const result = parseStaffApplicationListFilter({
      filterField: "submittedAt",
      dateMode: "relative",
      datePreset: "current_week",
    }, NOW);
    assert.equal(result.filter?.kind, "submittedAt");
    if (result.filter?.kind !== "submittedAt") return;
    assert.equal(result.filter.from.toISOString(), "2026-09-20T17:00:00.000Z");
    assert.equal(result.filter.toExclusive.toISOString(), "2026-09-27T17:00:00.000Z");
  });

  it("parses the previous month in Vietnam time", () => {
    const result = parseStaffApplicationListFilter({
      filterField: "submittedAt",
      dateMode: "relative",
      datePreset: "previous_month",
    }, NOW);
    assert.equal(result.filter?.kind, "submittedAt");
    if (result.filter?.kind !== "submittedAt") return;
    assert.equal(result.filter.from.toISOString(), "2026-07-31T17:00:00.000Z");
    assert.equal(result.filter.toExclusive.toISOString(), "2026-08-31T17:00:00.000Z");
  });

  it("treats one custom date as the full selected day", () => {
    const result = parseStaffApplicationListFilter({
      filterField: "submittedAt",
      dateMode: "custom",
      dateFrom: "2026-09-24",
    }, NOW);
    assert.equal(result.filter?.kind, "submittedAt");
    if (result.filter?.kind !== "submittedAt") return;
    assert.equal(result.filter.from.toISOString(), "2026-09-23T17:00:00.000Z");
    assert.equal(result.filter.toExclusive.toISOString(), "2026-09-24T17:00:00.000Z");
  });

  it("rejects a reversed custom range", () => {
    const result = parseStaffApplicationListFilter({
      filterField: "submittedAt",
      dateMode: "custom",
      dateFrom: "2026-09-24",
      dateTo: "2026-09-01",
    }, NOW);
    assert.equal(result.filter, undefined);
    assert.match(result.error ?? "", /Ngày kết thúc/u);
  });
});

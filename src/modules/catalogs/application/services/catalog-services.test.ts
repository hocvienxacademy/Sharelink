import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ConflictError, NotFoundError } from "../../../../shared/errors/index";
import type { Clock } from "../../../../shared/time/index";
import type {
  AdmissionPeriod,
  CatalogRepository,
  Major,
} from "../../domain/catalog-repository";
import { GetCurrentAdmissionPeriod } from "./get-current-admission-period";
import { ListAvailableMajors } from "./list-available-majors";

const clock: Clock = {
  now: () => new Date("2026-07-31T08:00:00.000Z"),
  today: () => "2026-07-31",
};

function period(
  overrides: Partial<AdmissionPeriod> = {},
): AdmissionPeriod {
  return {
    id: "period-1",
    code: "2026",
    name: "Admission 2026",
    startDate: "2026-07-31",
    endDate: "2026-07-31",
    isActive: true,
    ...overrides,
  };
}

class FakeCatalogRepository implements CatalogRepository {
  constructor(
    readonly periods: readonly AdmissionPeriod[] = [],
    readonly majors: readonly Major[] = [],
  ) {}

  async findAdmissionPeriodById(id: string) {
    return this.periods.find((item) => item.id === id) ?? null;
  }

  async findActiveMajorById(id: string) {
    return (
      this.majors.find((item) => item.id === id && item.isActive) ?? null
    );
  }

  async listActiveAdmissionPeriods() {
    return this.periods.filter((item) => item.isActive);
  }

  async listActiveMajors() {
    return this.majors.filter((item) => item.isActive);
  }
}

describe("GetCurrentAdmissionPeriod", () => {
  it("includes the full start and end calendar days", async () => {
    const service = new GetCurrentAdmissionPeriod(
      new FakeCatalogRepository([period()]),
      clock,
    );

    const result = await service.execute();

    assert.equal(result.code, "2026");
  });

  it("rejects a period that has not started", async () => {
    const service = new GetCurrentAdmissionPeriod(
      new FakeCatalogRepository([
        period({ startDate: "2026-08-01", endDate: "2026-08-31" }),
      ]),
      clock,
    );

    await assert.rejects(service.execute(), NotFoundError);
  });

  it("rejects a period that has ended", async () => {
    const service = new GetCurrentAdmissionPeriod(
      new FakeCatalogRepository([
        period({ startDate: "2026-07-01", endDate: "2026-07-30" }),
      ]),
      clock,
    );

    await assert.rejects(service.execute(), NotFoundError);
  });

  it("reports a conflict when multiple periods are open", async () => {
    const service = new GetCurrentAdmissionPeriod(
      new FakeCatalogRepository([
        period(),
        period({ id: "period-2", code: "2026-B" }),
      ]),
      clock,
    );

    await assert.rejects(service.execute(), ConflictError);
  });
});

describe("ListAvailableMajors", () => {
  it("returns only safe form fields from active majors", async () => {
    const repository = new FakeCatalogRepository([], [
      {
        id: "major-1",
        code: "IT",
        name: "Information Technology",
        displayOrder: 1,
        isActive: true,
      },
    ]);

    const result = await new ListAvailableMajors(repository).execute();

    assert.deepEqual(result, [
      {
        id: "major-1",
        code: "IT",
        name: "Information Technology",
      },
    ]);
  });
});

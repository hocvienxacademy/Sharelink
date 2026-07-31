import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

interface AuditAdvisory {
  readonly name: string;
  readonly url: string;
  readonly range: string;
  readonly nodes: readonly string[];
  readonly severity: string;
}

interface AuditPayload {
  readonly error?: unknown;
  readonly metadata?: {
    readonly vulnerabilities?: {
      readonly total?: number;
    };
  };
  readonly vulnerabilities?: Readonly<
    Record<
      string,
      {
        readonly via?: readonly (
          | string
          | {
              readonly url?: unknown;
              readonly range?: unknown;
              readonly severity?: unknown;
            }
        )[];
        readonly nodes?: readonly string[];
      }
    >
  >;
}

interface AdvisoryWaiver {
  readonly advisoryId: string;
  readonly package: string;
  readonly dependencyPaths: readonly string[];
  readonly affectedRange: string;
  readonly severity: string;
  readonly reasonUpgradeUnavailable: string;
  readonly exploitability: string;
  readonly compensatingControls: readonly string[];
  readonly owner: string;
  readonly approvedBy: string;
  readonly approvedAt: string;
  readonly expiresAt: string;
  readonly revocationConditions: readonly string[];
  readonly upstreamReference: string;
  readonly recheckVersion: string;
}

function advisoryId(url: string): string {
  return url.split("/").filter(Boolean).at(-1) ?? url;
}

function loadWaivers(): readonly AdvisoryWaiver[] {
  const directory = path.resolve("docs/security/advisory-waivers");
  return readdirSync(directory)
    .filter((name) => name.endsWith(".waiver.json"))
    .map((name) =>
      JSON.parse(readFileSync(path.join(directory, name), "utf8")),
    ) as AdvisoryWaiver[];
}

function validateWaiver(waiver: AdvisoryWaiver, today: string): void {
  if (
    !waiver.advisoryId ||
    !waiver.package ||
    !waiver.owner ||
    !waiver.approvedBy ||
    !waiver.approvedAt ||
    !waiver.expiresAt ||
    !waiver.severity ||
    !waiver.reasonUpgradeUnavailable ||
    !waiver.exploitability ||
    !waiver.upstreamReference ||
    !waiver.recheckVersion ||
    waiver.dependencyPaths.length === 0 ||
    waiver.compensatingControls.length === 0 ||
    waiver.revocationConditions.length === 0 ||
    /^(UNASSIGNED|UNAPPROVED|TBD)$/i.test(waiver.owner) ||
    /^(UNASSIGNED|UNAPPROVED|TBD)$/i.test(waiver.approvedBy)
  ) {
    throw new Error(`Waiver ${waiver.advisoryId || "<unknown>"} is incomplete.`);
  }
  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  const approvedAtMs = Date.parse(`${waiver.approvedAt}T00:00:00Z`);
  const expiresAtMs = Date.parse(`${waiver.expiresAt}T00:00:00Z`);
  const datesAreCanonical =
    !Number.isNaN(approvedAtMs) &&
    !Number.isNaN(expiresAtMs) &&
    new Date(approvedAtMs).toISOString().slice(0, 10) === waiver.approvedAt &&
    new Date(expiresAtMs).toISOString().slice(0, 10) === waiver.expiresAt;
  if (
    !isoDate.test(waiver.approvedAt) ||
    !isoDate.test(waiver.expiresAt) ||
    !datesAreCanonical ||
    expiresAtMs <= approvedAtMs ||
    waiver.approvedAt > today
  ) {
    throw new Error(`Waiver ${waiver.advisoryId} has invalid approval dates.`);
  }
  const lifetimeDays = (expiresAtMs - approvedAtMs) / 86_400_000;
  if (lifetimeDays > 90) {
    throw new Error(`Waiver ${waiver.advisoryId} exceeds the 90-day maximum.`);
  }
  if (waiver.expiresAt < today) {
    throw new Error(`Waiver ${waiver.advisoryId} expired on ${waiver.expiresAt}.`);
  }
}

const audit =
  process.platform === "win32"
    ? spawnSync(process.env.ComSpec ?? "cmd.exe", [
        "/d",
        "/s",
        "/c",
        "npm audit --json",
      ], {
        cwd: process.cwd(),
        encoding: "utf8",
      })
    : spawnSync("npm", ["audit", "--json"], {
        cwd: process.cwd(),
        encoding: "utf8",
      });
if (!audit.stdout) {
  throw new Error("npm audit did not return JSON output.");
}

const payload = JSON.parse(audit.stdout) as AuditPayload;
if (
  payload.error !== undefined ||
  payload.vulnerabilities === undefined ||
  payload.metadata?.vulnerabilities?.total === undefined
) {
  throw new Error("npm audit did not complete successfully.");
}
const advisories: AuditAdvisory[] = [];
for (const [name, vulnerability] of Object.entries(
  payload.vulnerabilities ?? {},
)) {
  for (const via of vulnerability.via ?? []) {
    if (
      typeof via !== "string" &&
      typeof via.url === "string" &&
      typeof via.range === "string"
    ) {
      advisories.push({
        name,
        url: via.url,
        range: via.range,
        nodes: vulnerability.nodes ?? [],
        severity:
          "severity" in via && typeof via.severity === "string"
            ? via.severity
            : "unknown",
      });
    }
  }
}

const today = new Date().toISOString().slice(0, 10);
const waivers = loadWaivers();
for (const waiver of waivers) validateWaiver(waiver, today);

const failures: string[] = [];
for (const advisory of advisories) {
  const id = advisoryId(advisory.url);
  const waiver = waivers.find(
    (candidate) =>
      candidate.advisoryId === id && candidate.package === advisory.name,
  );
  if (!waiver) {
    failures.push(`${id} (${advisory.name}) has no approved waiver.`);
    continue;
  }
  if (waiver.affectedRange !== advisory.range) {
    failures.push(`${id} affected range changed and requires review.`);
  }
  if (waiver.severity !== advisory.severity) {
    failures.push(`${id} severity changed and requires review.`);
  }
  if (
    advisory.nodes.some((node) => !waiver.dependencyPaths.includes(node)) ||
    waiver.dependencyPaths.some((node) => !advisory.nodes.includes(node))
  ) {
    failures.push(`${id} dependency path changed and requires review.`);
  }
}

const activeIds = new Set(advisories.map((item) => advisoryId(item.url)));
for (const waiver of waivers) {
  if (!activeIds.has(waiver.advisoryId)) {
    failures.push(
      `${waiver.advisoryId} waiver is stale; remove it after confirming the fix.`,
    );
  }
}

if (failures.length > 0) {
  console.error("Dependency policy blocked promotion:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Dependency policy passed: ${advisories.length} advisories, ${waivers.length} active waivers.`,
);

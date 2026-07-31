import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";

function command(commandName: string, args: readonly string[]): string {
  const result = spawnSync(commandName, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(`${commandName} failed while packaging the artifact.`);
  }
  return result.stdout.trim();
}

function sha256(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

const commitSha = command("git", ["rev-parse", "HEAD"]);
const expectedSha = process.env.RELEASE_SHA;
if (!expectedSha || expectedSha !== commitSha) {
  throw new Error("RELEASE_SHA must exactly match the current commit.");
}
if (command("git", ["status", "--porcelain"]) !== "") {
  throw new Error("Refusing to package an artifact from a dirty worktree.");
}
if (!existsSync(".next/standalone") || !existsSync(".next/static")) {
  throw new Error("Run the reviewed production build before packaging.");
}

const temporaryRoot = mkdtempSync(path.join(tmpdir(), "share-link-artifact-"));
const bundleRoot = path.join(temporaryRoot, "bundle");
const artifactDirectory = path.resolve("artifacts");
const artifactName = `share-link-student-${commitSha}.tar.gz`;
const artifactPath = path.join(artifactDirectory, artifactName);

try {
  cpSync(".next/standalone", bundleRoot, { recursive: true });
  mkdirSync(path.join(bundleRoot, ".next"), { recursive: true });
  cpSync(".next/static", path.join(bundleRoot, ".next/static"), {
    recursive: true,
  });
  if (existsSync("public")) {
    cpSync("public", path.join(bundleRoot, "public"), { recursive: true });
  }

  const metadata = {
    commitSha,
    lockfileSha256: sha256("package-lock.json"),
    nodeVersion: process.version,
    npmVersion: command(process.platform === "win32" ? "npm.cmd" : "npm", [
      "--version",
    ]),
    buildCommand: "npm run build",
    packagedAt: new Date().toISOString(),
  };
  writeFileSync(
    path.join(bundleRoot, "release-metadata.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
    "utf8",
  );

  mkdirSync(artifactDirectory, { recursive: true });
  command("tar", ["-czf", artifactPath, "-C", bundleRoot, "."]);
  const artifactSha256 = sha256(artifactPath);
  writeFileSync(
    `${artifactPath}.sha256`,
    `${artifactSha256}  ${artifactName}\n`,
    "utf8",
  );
  console.log(`${artifactName} SHA256 ${artifactSha256}`);
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

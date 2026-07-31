# Dependency audit status

Audit date: 2026-07-31.

`npm audit --json` reports three high-severity dependency entries and no
critical advisories:

- `next@16.2.12` includes `postcss@8.4.31`, affected by PostCSS advisories up
  to 8.5.17 (`GHSA-qx2v-qp2m-jg93`, `GHSA-6g55-p6wh-862q`,
  `GHSA-r28c-9q8g-f849`). The root build toolchain uses patched
  `postcss@8.5.25`, but Next's private copy cannot be deduplicated safely.
- Next optionally installs `sharp@0.34.5`, affected by the advisory covering
  Sharp versions below 0.35.0 (`GHSA-f88m-g3jw-g9cj`).
- The `next` entry inherits both dependency findings.

The current application does not import `next/image`, accept uploaded images,
or process user-provided CSS/source maps. That reduces current reachability,
but does not remove the vulnerable packages from the build/runtime image.
Production browser source maps are explicitly disabled.

The registry's proposed automatic fix is a breaking downgrade to
`next@9.3.3`; it is incompatible and must not be applied. No blind PostCSS
override or out-of-range Sharp override is approved. Track a compatible Next
release that upgrades both nested dependencies, re-run the full gate after
upgrading, and keep staging blocked if the deployment threat model introduces
untrusted image/CSS processing.

CI retains plain `npm audit` as an informational report and uses
`npm run audit:policy` as the promotion gate. The policy matches advisory ID,
package, affected range, and exact dependency paths; it rejects new, expired,
stale, or changed waivers. No waiver has been approved in this repository, so
the three current high findings continue to block staging promotion.
`npm audit fix --force` is prohibited.

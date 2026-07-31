# Staging acceptance record

Status: **not approved**. This file is a release record template, not evidence
that external infrastructure exists.

## Release candidate

- Commit SHA:
- Annotated tag:
- Lockfile SHA-256:
- Artifact SHA-256:
- Node/npm/Next/Prisma versions:
- Build start, duration, and operator:
- RC approver:

## Infrastructure

- HTTPS hostname and certificate check:
- Staging PostgreSQL database/role (non-secret identifier):
- Schema-only export checksum and schema verification:
- Backup identifier/checksum and duration:
- Restore-test target and duration:
- Redis staging instance and cross-replica result:
- Trusted proxy header and body limit (`65536` bytes):
- Deployment platform/release identifier:

## Acceptance evidence

- Automated staging smoke:
- Rate-limit smoke/TTL/restart/cross-instance:
- Security headers and cache behavior:
- Visual review screenshots for all six viewports:
- Keyboard/screen-reader/contrast/200% zoom review:
- Business UAT reviewer and decisions:
- Previous-artifact rollback and read-only smoke:
- Log/PII inspection:
- Advisory policy and waiver approvals:

## Decision

- Staging approved by/date:
- Open issues and accepted risks:
- Production promotion: **out of scope and prohibited for Prompt 9**.

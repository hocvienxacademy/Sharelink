---
name: windows-powershell-workflow
description: Translate and execute ShareLinkStudent development, Prisma, file, environment, and verification workflows safely in Windows PowerShell. Use when proposing or running shell commands in this repository or converting Bash instructions. Do not use for commands executed exclusively in a verified non-Windows shell.
---

# Work safely in PowerShell

## Inspect project commands

Read `package.json` before proposing npm or Prisma commands. Prefer existing scripts:

```powershell
npm run prisma:pull
npm run prisma:generate
npm run prisma:validate
npm run prisma:format
```

Use `npx prisma <command>` only when no appropriate script exists and the local CLI is required. Do not claim lint, typecheck, test, build, or migration scripts exist unless `package.json` defines them.

## Use PowerShell syntax

- Set a task-specific environment variable with `$env:NAME = "value"` and remove it with `Remove-Item Env:NAME`.
- Use `Get-ChildItem`, `Get-Content`, `Copy-Item`, `Move-Item`, and `Remove-Item` with `-LiteralPath` when paths are known.
- Quote paths containing spaces.
- Use `rg` for repository search when available.
- Do not emit Bash-only `export`, `rm -rf`, `cp`, `mv`, `grep`, `source`, or `/tmp` commands without a PowerShell equivalent.
- Do not repurpose `$HOME`, `$home`, or `$CODEX_HOME` for task variables.

## Protect files and databases

- Resolve and inspect exact paths before recursive delete or move.
- Keep recursive operations inside the intended workspace.
- Do not pass PowerShell-enumerated paths to another shell for deletion or moving.
- Never print `.env` or connection strings.
- Load `$database-migration-safety` before migration commands.
- Never run `prisma migrate reset` or `prisma db push --accept-data-loss`.
- Use `migrate dev` only for a verified disposable development database and `migrate deploy` only for an authorized deployment.

## Report

State commands executed, working directory, exit status, files or database affected, and commands skipped because scripts, permissions, or safe target context were missing.

---
name: codegraph
description: Use the local CodeGraph index to understand, locate, trace, and assess changes to ShareLinkStudent code. Trigger for architecture questions, symbol or file discovery, call paths, data flows, bug investigation, refactoring, impact analysis, affected tests, and before editing indexed source. Do not use for non-code assets or when the target path has no `.codegraph/` index.
---

# Explore code with CodeGraph

## Query the graph first

1. Confirm the target is inside this repository and `.codegraph/` exists.
2. Call `codegraph_explore` before grep, file search, or reading source.
3. Pass the absolute repository path as `projectPath`.
4. Ask one focused natural-language question containing the relevant symbol, file, route, or flow names.
5. Set `maxFiles` only when the default result is too broad or too narrow.

Use CodeGraph for questions such as:

- how a request reaches Prisma;
- where a symbol is defined and called;
- which modules participate in a workflow;
- what can break when a symbol changes;
- which tests or callers are affected;
- which source files must be inspected before an edit.

## Trust returned source

Treat line-numbered source returned by CodeGraph as already read. Do not reopen or grep the same source merely to verify it. Use a second focused graph query only when the first result leaves a concrete gap.

Pay attention to call paths, dynamic-dispatch hops, blast radius, and any staleness warning. Distinguish graph evidence from domain assumptions.

## Work after edits

- Let the MCP server auto-sync after normal file changes.
- Re-query the changed symbol or flow when correctness depends on updated call paths.
- If a staleness warning persists, use the CodeGraph sync/status workflow before trusting impact results.
- Do not recreate or delete `.codegraph/` unless the user explicitly requests index maintenance.

## Fallback

If the MCP tool is unavailable, use `codegraph explore "<query>"` only when the CLI is installed and resolvable. Otherwise use repository search/read tools and state that CodeGraph was unavailable; do not download or globally install tooling implicitly.

## Report

Summarize the relevant symbols, call path, blast radius, unresolved gaps, and whether the graph was current.

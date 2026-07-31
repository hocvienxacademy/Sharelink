---
name: form-validation
description: Design or implement consistent validation for ShareLinkStudent forms, request DTOs, API boundaries, multi-step applications, dates, and database-aligned fields. Use when adding or changing frontend form fields, validators, parsing, normalization, submission rules, or validation errors. Do not use to invent undocumented business formats or required-field rules.
---

# Align validation across layers

## Derive the contract

1. Read the domain rule, request/output DTO, Prisma field, PostgreSQL constraint, and existing UI behavior.
2. Distinguish representation constraints from business rules.
3. Reuse one shared validation schema when the architecture and trust boundaries allow it; always revalidate on the server.
4. Load `$postgres-check-constraints` when a database CHECK rule is involved.

## Model absence precisely

Define each input as one of:

- required and non-null;
- optional/omitted;
- nullable;
- blank-string capable.

Do not silently treat `undefined`, `null`, and `""` as equivalent. Normalize empty form controls only when the API contract explicitly maps them to omission or `null`.

## Normalize conservatively

- Trim accidental surrounding whitespace, but preserve meaningful internal spacing and Vietnamese names.
- Parse and validate dates explicitly before persistence; avoid timezone conversion for PostgreSQL `date` fields.
- Validate enum membership from shared/generated definitions.
- Bound string and numeric inputs consistently with database types.
- Do not invent regexes for citizen ID, phone, application code, names, or addresses. Obtain the business specification first.
- Never coerce malformed values into plausible data.

## Validate multi-step applications

- Validate each step for immediate field feedback.
- Revalidate the complete aggregate and required relations before formal submission.
- Return stable error codes plus Vietnamese, field-specific messages where the product requires them.
- Preserve submitted values when the server rejects recoverable input.
- Focus the first invalid field and provide an error summary when a UI exists.
- Disable duplicate submission while preserving idempotency or concurrency checks on the server.

## Test

Cover omitted/null/blank values, length and numeric boundaries, invalid calendar dates, Unicode and whitespace, enum failures, cross-field rules, server-side bypass of client validation, and full-submit failures after valid individual steps.

Report the contract source, normalization decisions, client/server/database alignment, undocumented rules left unresolved, and tests executed.

# Application submission decisions

## Implemented boundary

- Only `DRAFT` applications are submittable.
- Completeness is evaluated by `DefaultSubmissionPolicy` without database or
  HTTP dependencies.
- `SubmitApplication` continues to validate the registration link, admission
  period, major, registration scope, and optimistic-concurrency version.
- The Prisma transaction updates the application and creates its status
  history together.

## Registration link after submission

Submitting an application currently does not change `registration_links`.
Although the schema contains `SUBMITTED`, `submitted_at`, and link status
history, no approved rule says an application submission must perform that
transition. If approved later, the application update, link update, and both
history records must share one transaction through an explicit cross-module
unit of work.

## Access count

`access_count` is not incremented because its meaning is undocumented. It must
not be changed by pure link validation. If it is confirmed to mean successful
form opens, increment it atomically with `last_accessed_at` in a dedicated
application use case after successful context resolution.

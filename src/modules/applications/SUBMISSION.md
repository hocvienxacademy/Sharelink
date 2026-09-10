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

## Submission email

- The submission transaction sets `submission_email_status` to `PENDING` and
  preserves the existing hashed Word-download credential.
- After the transaction commits, a dispatcher generates the attachment through
  the same `DocxTemplateGenerator` and filename path used by student downloads.
- The HTML body is maintained in
  `infrastructure/templates/submission-confirmation.html`. Its allowlisted,
  HTML-escaped variables are `ho_ten`, `ma_phieu`, `nganh_dang_ky`,
  `doi_tuong_dau_vao`, `thoi_gian_gui`, and `logo_tvu_url`.
- Transport acceptance changes the status to `SENT`; generation/provider failure
  changes it to `FAILED`. Neither outcome rolls back a submitted application.
- `SENT` means accepted by the configured transport, not confirmed inbox delivery. Delivery and
  bounce tracking remain future webhook/outbox work.
- A future durable outbox adapter may return `PENDING` after enqueueing without
  changing the submission use case contract.

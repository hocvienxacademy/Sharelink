# Manual review and UAT checklist

Record reviewer, date, browser/device, screenshot path, outcome, and issue for
each item. Do not automatically approve visual baselines.

Visual review uses 320×568, 375×667, 390×844, 768×1024, 1280×800, and
1440×900 for: empty form, validation errors, one/two relatives, review,
success, unavailable link, conflict, loading, and network error. Check
overflow, clipping, mobile keyboard obstruction, controls, error summary,
focus ring, and layout shift.

Accessibility review covers keyboard-only navigation, logical tab order,
visible/followed focus, labels and required semantics, announced errors and
relative changes, contrast, 200% zoom/reflow, section traps, heading structure,
and submit announcement. Axe results alone are not WCAG certification.

Business UAT confirms Vietnamese labels/order, required fields, optional
`workplace`, optional major and entry qualification under the current policy,
optional relatives, five required fields when a relative is added, maximum
two relatives, review/success/unavailable copy, and the documented
post-submit operational process. Record decisions as issues; do not change
`SubmissionPolicy` from reviewer inference.

import type { FieldPath } from "react-hook-form";
import type { ApplicationFormValues } from "./application-form.types";

export type ApplicationFieldName = FieldPath<ApplicationFormValues>;

export function applicationFieldId(name: ApplicationFieldName): string {
  return `application-field-${name.replaceAll(".", "-")}`;
}

export function focusAndScrollToField(name: ApplicationFieldName): void {
  const target = document.getElementById(applicationFieldId(name));
  if (!(target instanceof HTMLElement)) return;

  target.focus({ preventScroll: true });
  if (typeof target.scrollIntoView === "function") {
    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }
}

/** Field names rendered with `data-field-name` that match `selector`. */
function fieldNamesMatching(
  form: HTMLFormElement | null,
  selector: string,
): ApplicationFieldName[] {
  return Array.from(form?.querySelectorAll<HTMLElement>(selector) ?? [])
    .map((field) => field.dataset.fieldName)
    .filter((name): name is ApplicationFieldName => name !== undefined);
}

/** Required fields on the current page that are still empty. */
export function findMissingRequiredFields(
  form: HTMLFormElement | null,
): ApplicationFieldName[] {
  return fieldNamesMatching(
    form,
    '[data-field-name][data-required="true"][data-empty="true"]',
  );
}

export function findFirstInvalidField(
  form: HTMLFormElement | null,
): ApplicationFieldName | undefined {
  return fieldNamesMatching(form, '[data-field-name][data-invalid="true"]')[0];
}

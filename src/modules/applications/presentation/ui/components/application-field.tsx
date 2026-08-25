"use client";

import { Controller, useFormContext, type FieldPath } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ApplicationFormValues } from "../application-form.types";

interface FieldOption {
  readonly label: string;
  readonly value: string;
}

interface BaseFieldProps {
  readonly description?: string;
  readonly label: string;
  readonly name: FieldPath<ApplicationFormValues>;
  readonly optional?: boolean;
  readonly required?: boolean;
}

function fieldId(name: FieldPath<ApplicationFormValues>): string {
  return `application-field-${name.replaceAll(".", "-")}`;
}

function FieldLabelText({
  label,
  optional,
  required,
}: Pick<BaseFieldProps, "label" | "optional" | "required">) {
  return (
    <>
      {label}
      {required ? <span aria-hidden="true"> *</span> : null}
      {optional ? " (không bắt buộc)" : null}
    </>
  );
}

export function ApplicationTextField({
  description,
  label,
  name,
  optional,
  required,
  type = "text",
  inputMode,
  multiline = false,
}: BaseFieldProps & {
  readonly inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  readonly multiline?: boolean;
  readonly type?: React.HTMLInputTypeAttribute;
}) {
  const { control } = useFormContext<ApplicationFormValues>();
  const id = fieldId(name);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const describedBy = [
          description === undefined ? null : `${id}-description`,
          fieldState.error === undefined ? null : `${id}-error`,
        ]
          .filter((value): value is string => value !== null)
          .join(" ");
        const displayValue =
          typeof field.value === "number"
            ? String(field.value)
            : typeof field.value === "string"
              ? field.value
              : "";
        const handleChange = (
          event:
            | React.ChangeEvent<HTMLInputElement>
            | React.ChangeEvent<HTMLTextAreaElement>,
        ) => {
          const value = event.target.value;

          if (type === "number") {
            field.onChange(value === "" ? null : Number(value));
            return;
          }

          field.onChange(value === "" ? null : value);
        };
        const controlProps = {
          "aria-describedby": describedBy || undefined,
          "aria-invalid": fieldState.invalid,
          id,
          name: field.name,
          onBlur: field.onBlur,
          onChange: handleChange,
          value: displayValue,
        } as const;

        return (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id}>
              <FieldLabelText
                label={label}
                optional={optional}
                required={required}
              />
            </FieldLabel>
            {multiline ? (
              <Textarea {...controlProps} />
            ) : (
              <Input
                {...controlProps}
                inputMode={inputMode}
                type={type}
              />
            )}
            {description === undefined ? null : (
              <FieldDescription id={`${id}-description`}>
                {description}
              </FieldDescription>
            )}
            {fieldState.error === undefined ? null : (
              <FieldError id={`${id}-error`}>
                {fieldState.error.message}
              </FieldError>
            )}
          </Field>
        );
      }}
    />
  );
}

export function ApplicationSelectField({
  description,
  label,
  name,
  optional,
  options,
  required,
}: BaseFieldProps & {
  readonly options: readonly FieldOption[];
}) {
  const { control } = useFormContext<ApplicationFormValues>();
  const id = fieldId(name);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>
            <FieldLabelText
              label={label}
              optional={optional}
              required={required}
            />
          </FieldLabel>
          <Select
            items={options}
            value={typeof field.value === "string" ? field.value : null}
            onValueChange={(value) => field.onChange(value ?? null)}
          >
            <SelectTrigger
              id={id}
              className="w-full"
              aria-describedby={
                fieldState.error === undefined ? undefined : `${id}-error`
              }
              aria-invalid={fieldState.invalid}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {description === undefined ? null : (
            <FieldDescription>{description}</FieldDescription>
          )}
          {fieldState.error === undefined ? null : (
            <FieldError id={`${id}-error`}>
              {fieldState.error.message}
            </FieldError>
          )}
        </Field>
      )}
    />
  );
}

export function ApplicationCheckboxField({
  description,
  label,
  name,
}: BaseFieldProps) {
  const { control } = useFormContext<ApplicationFormValues>();
  const id = fieldId(name);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field
          orientation="horizontal"
          data-invalid={fieldState.invalid}
        >
          <Checkbox
            id={id}
            checked={field.value === true}
            onCheckedChange={(checked) => field.onChange(checked === true)}
            aria-describedby={
              description === undefined ? undefined : `${id}-description`
            }
            aria-invalid={fieldState.invalid}
          />
          <FieldContent>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            {description === undefined ? null : (
              <FieldDescription id={`${id}-description`}>
                {description}
              </FieldDescription>
            )}
            {fieldState.error === undefined ? null : (
              <FieldError>{fieldState.error.message}</FieldError>
            )}
          </FieldContent>
        </Field>
      )}
    />
  );
}

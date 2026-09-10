"use client";

import { Controller, useFormContext, type FieldPath } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ApplicationFormValues } from "../application-form.types";

interface FieldOption {
  readonly label: string;
  readonly value: string;
}

interface BaseFieldProps {
  readonly className?: string;
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
  autoCapitalize,
  autoComplete,
  className,
  description,
  inputMode,
  label,
  max,
  maxLength,
  min,
  name,
  optional,
  placeholder,
  required,
  spellCheck,
  type = "text",
  multiline = false,
}: BaseFieldProps & {
  readonly autoCapitalize?: React.HTMLAttributes<HTMLInputElement>["autoCapitalize"];
  readonly autoComplete?: React.InputHTMLAttributes<HTMLInputElement>["autoComplete"];
  readonly inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  readonly max?: number;
  readonly maxLength?: number;
  readonly min?: number;
  readonly multiline?: boolean;
  readonly placeholder?: string;
  readonly spellCheck?: React.HTMLAttributes<HTMLInputElement>["spellCheck"];
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
          <Field
            className={className}
            data-empty={displayValue === ""}
            data-field-name={field.name}
            data-invalid={fieldState.invalid}
            data-required={required || undefined}
          >
            <FieldLabel htmlFor={id}>
              <FieldLabelText
                label={label}
                optional={optional}
                required={required}
              />
            </FieldLabel>
            {multiline ? (
              <Textarea
                {...controlProps}
                autoCapitalize={autoCapitalize}
                autoComplete={autoComplete}
                className="min-h-24"
                maxLength={maxLength}
                placeholder={placeholder}
                required={required}
                spellCheck={spellCheck}
              />
            ) : (
              <Input
                {...controlProps}
                autoCapitalize={autoCapitalize}
                autoComplete={autoComplete}
                className="min-h-11"
                inputMode={inputMode}
                max={max}
                maxLength={maxLength}
                min={min}
                placeholder={placeholder}
                required={required}
                spellCheck={spellCheck}
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

export function ApplicationDatePickerField({
  className,
  description,
  label,
  name,
  optional,
  placeholder = "Chọn ngày",
  required,
}: BaseFieldProps & {
  readonly placeholder?: string;
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

        return (
          <Field
            className={cn("[&_button]:min-h-11", className)}
            data-empty={field.value === null || field.value === undefined}
            data-field-name={field.name}
            data-invalid={fieldState.invalid}
            data-required={required || undefined}
          >
            <FieldLabel htmlFor={id}>
              <FieldLabelText
                label={label}
                optional={optional}
                required={required}
              />
            </FieldLabel>
            <DatePicker
              id={id}
              value={typeof field.value === "string" ? field.value : null}
              placeholder={placeholder}
              required={required}
              aria-describedby={describedBy || undefined}
              aria-invalid={fieldState.invalid}
              onBlur={field.onBlur}
              onValueChange={field.onChange}
            />
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
  className,
  description,
  disabled = false,
  label,
  name,
  optional,
  options,
  placeholder,
  required,
}: BaseFieldProps & {
  readonly disabled?: boolean;
  readonly options: readonly FieldOption[];
  readonly placeholder?: string;
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

        return (
        <Field
          className={className}
          data-empty={field.value === null || field.value === undefined}
          data-field-name={field.name}
          data-invalid={fieldState.invalid}
          data-required={required || undefined}
        >
          <FieldLabel htmlFor={id}>
            <FieldLabelText
              label={label}
              optional={optional}
              required={required}
            />
          </FieldLabel>
          <Select
            disabled={disabled}
            items={options}
            value={typeof field.value === "string" ? field.value : null}
            onValueChange={(value) => field.onChange(value ?? null)}
          >
            <SelectTrigger
              id={id}
              className="min-h-11 w-full"
              aria-describedby={describedBy || undefined}
              aria-invalid={fieldState.invalid}
              aria-required={required}
            >
              <SelectValue placeholder={placeholder} />
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

export function ApplicationComboboxField({
  allowCustomValue = true,
  autoComplete,
  className,
  description,
  disabled = false,
  emptyMessage = "Không tìm thấy kết quả.",
  label,
  name,
  maxLength,
  onInputValueChange,
  optional,
  options,
  placeholder,
  required,
}: BaseFieldProps & {
  readonly allowCustomValue?: boolean;
  readonly autoComplete?: React.InputHTMLAttributes<HTMLInputElement>["autoComplete"];
  readonly disabled?: boolean;
  readonly emptyMessage?: string;
  readonly maxLength?: number;
  readonly onInputValueChange?: (value: string) => void;
  readonly options: readonly FieldOption[];
  readonly placeholder?: string;
}) {
  const { control } = useFormContext<ApplicationFormValues>();
  const id = fieldId(name);
  const values = options.map((option) => option.value);

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

        return (
          <Field
            className={className}
            data-disabled={disabled || undefined}
            data-empty={
              typeof field.value !== "string" || field.value.trim() === ""
            }
            data-field-name={field.name}
            data-invalid={fieldState.invalid}
            data-required={required || undefined}
          >
            <FieldLabel htmlFor={id}>
              <FieldLabelText
                label={label}
                optional={optional}
                required={required}
              />
            </FieldLabel>
            <Combobox
              disabled={disabled}
              items={values}
              value={typeof field.value === "string" ? field.value : null}
              onInputValueChange={(value) => {
                if (allowCustomValue) {
                  field.onChange(value === "" ? null : value);
                }
                onInputValueChange?.(value);
              }}
              onValueChange={(value) => field.onChange(value ?? null)}
            >
              <ComboboxInput
                id={id}
                autoComplete={autoComplete}
                className="min-h-11"
                name={field.name}
                maxLength={maxLength}
                placeholder={placeholder}
                aria-describedby={describedBy || undefined}
                aria-invalid={fieldState.invalid}
                aria-required={required}
                onBlur={field.onBlur}
              />
              <ComboboxContent>
                <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
                <ComboboxList>
                  {(value: string) => {
                    const option = options.find((item) => item.value === value);
                    return (
                      <ComboboxItem key={value} value={value}>
                        {option?.label ?? value}
                      </ComboboxItem>
                    );
                  }}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
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

export function ApplicationCheckboxField({
  className,
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
          className={className}
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

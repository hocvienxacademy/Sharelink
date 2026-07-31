export interface ValidationIssue {
  readonly path: readonly (string | number)[];
  readonly code: string;
  readonly message: string;
}

export type ValidationResult<T> =
  | {
      readonly success: true;
      readonly data: T;
    }
  | {
      readonly success: false;
      readonly issues: readonly ValidationIssue[];
    };

export interface Validator<T> {
  validate(input: unknown): ValidationResult<T>;
}

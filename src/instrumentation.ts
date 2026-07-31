import { validateRuntimeEnvironment } from "./shared/config/runtime-environment";

export function register(): void {
  validateRuntimeEnvironment();
}

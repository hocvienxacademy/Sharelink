export type OperationalMetric =
  | "request_count"
  | "error_count"
  | "latency_ms"
  | "database_failure"
  | "rate_limit_block"
  | "redis_failure"
  | "create_success"
  | "update_success"
  | "submit_success"
  | "version_conflict";

export interface OperationalTelemetry {
  record(
    metric: OperationalMetric,
    fields?: Readonly<{
      durationMs?: number;
      requestId?: string;
      routeClass?: string;
      status?: number;
    }>,
  ): void;
}

class NoopOperationalTelemetry implements OperationalTelemetry {
  record(): void {}
}

class JsonOperationalTelemetry implements OperationalTelemetry {
  constructor(
    private readonly environment: string,
    private readonly releaseSha: string,
  ) {}

  record(
    metric: OperationalMetric,
    fields: Readonly<{
      durationMs?: number;
      requestId?: string;
      routeClass?: string;
      status?: number;
    }> = {},
  ): void {
    console.info(
      JSON.stringify({
        type: "operational_metric",
        metric,
        environment: this.environment,
        releaseSha: this.releaseSha,
        ...fields,
      }),
    );
  }
}

export function getOperationalTelemetry(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): OperationalTelemetry {
  if (environment.APP_ENV !== "staging" && environment.APP_ENV !== "production") {
    return new NoopOperationalTelemetry();
  }
  return new JsonOperationalTelemetry(
    environment.APP_ENV,
    environment.RELEASE_SHA ?? "missing-release",
  );
}

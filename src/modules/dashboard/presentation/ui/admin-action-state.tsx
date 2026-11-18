"use client";

import { useState } from "react";
import { HistoryIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { requestJson } from "@/shared/http/browser/json-api-client";
import { formatDateTime } from "@/shared/presentation/format";

export interface AdminFeedback {
  readonly message: string;
  readonly error: boolean;
}

export interface AdminActionMessages<T> {
  /** Omit for read-only actions that should not show an "updated" alert. */
  readonly success?: string | ((result: T) => string);
  readonly failure: string;
}

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

/**
 * Tracks the pending flag and success/error feedback of admin mutations so
 * panels do not repeat the same try/catch/finally block for every action.
 */
export function useAdminAction() {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<AdminFeedback | null>(null);

  async function run<T>(
    operation: () => Promise<T>,
    messages: AdminActionMessages<T>,
  ): Promise<T | undefined> {
    setPending(true);
    setFeedback(null);
    try {
      const result = await operation();
      const success =
        typeof messages.success === "function"
          ? messages.success(result)
          : messages.success;
      if (success !== undefined)
        setFeedback({ message: success, error: false });
      return result;
    } catch (error) {
      setFeedback({
        message: errorMessage(error, messages.failure),
        error: true,
      });
      return undefined;
    } finally {
      setPending(false);
    }
  }

  const fail = (message: string) => setFeedback({ message, error: true });

  return { pending, feedback, run, fail, setFeedback };
}

export function AdminFeedbackAlert({
  feedback,
}: {
  readonly feedback: AdminFeedback | null;
}) {
  if (feedback === null) return null;
  return (
    <Alert variant={feedback.error ? "destructive" : "default"}>
      <AlertTitle>
        {feedback.error ? "Không thể thực hiện" : "Đã cập nhật"}
      </AlertTitle>
      <AlertDescription>{feedback.message}</AlertDescription>
    </Alert>
  );
}

export interface AdminHistoryEntry {
  readonly id: string;
  readonly action: string;
  readonly actorName: string | null;
  readonly occurredAt: string;
}

export function AdminHistoryList({
  entries,
}: {
  readonly entries: readonly AdminHistoryEntry[];
}) {
  return (
    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
      {entries.length === 0 ? (
        <span>Chưa có lịch sử.</span>
      ) : (
        entries.map((entry) => (
          <span key={entry.id}>
            {entry.action} · {entry.actorName ?? "Hệ thống"} ·{" "}
            {formatDateTime(entry.occurredAt)}
          </span>
        ))
      )}
    </div>
  );
}

/** A "Lịch sử" button that lazily loads and lists the audit history at `path`. */
export function AdminHistoryButton({ path }: { readonly path: string }) {
  const [entries, setEntries] = useState<readonly AdminHistoryEntry[] | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setEntries(await requestJson<readonly AdminHistoryEntry[]>(path, "GET"));
    } catch (loadError) {
      setError(errorMessage(loadError, "Không thể tải lịch sử."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={load}
        disabled={loading}
      >
        {loading ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <HistoryIcon data-icon="inline-start" />
        )}
        Lịch sử
      </Button>
      {error !== null && (
        <span className="text-xs text-destructive">{error}</span>
      )}
      {entries !== null && <AdminHistoryList entries={entries} />}
    </div>
  );
}

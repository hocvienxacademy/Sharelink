import { CheckCircle2Icon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function RevisionRequestAlert({ reason }: { readonly reason: string }) {
  return (
    <Alert>
      <AlertTitle>Hồ sơ cần bổ sung</AlertTitle>
      <AlertDescription className="whitespace-pre-wrap">
        {reason}
      </AlertDescription>
    </Alert>
  );
}

/** Validation, conflict and request errors shown above the form. */
export function FormProblemAlert({
  message,
  summaryItems,
  hasConflict,
}: {
  readonly message: string;
  readonly summaryItems: readonly string[];
  readonly hasConflict: boolean;
}) {
  return (
    <Alert variant={hasConflict ? "destructive" : "default"}>
      <AlertTitle>
        {hasConflict ? "Dữ liệu đã thay đổi" : "Cần kiểm tra lại"}
      </AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        {summaryItems.length > 0 && (
          <ul className="mt-2 list-disc pl-5">
            {summaryItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
        {hasConflict && (
          <p className="mt-2">
            Thay đổi chưa lưu trên màn hình có thể bị mất khi tải lại.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function SavedStatus({ message }: { readonly message: string }) {
  return (
    <output className="flex items-center gap-2 text-sm font-medium">
      <CheckCircle2Icon aria-hidden="true" />
      {message}
    </output>
  );
}

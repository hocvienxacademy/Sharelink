import type { ComponentProps, ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  description,
  contentClassName,
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly contentClassName?: string;
  readonly children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}

export function NativeSelect({
  className,
  ...props
}: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "border-input bg-background h-9 w-full rounded-md border px-3 text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function OperationResultAlert({
  message,
}: {
  readonly message: string | null;
}) {
  if (message === null) return null;
  return (
    <Alert className="xl:col-span-2">
      <AlertTitle>Kết quả thao tác</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

/** Layout for a single input with its submit button on the same row on desktop. */
export const inlineFormClassName =
  "flex flex-col items-stretch gap-3 sm:flex-row sm:items-end";

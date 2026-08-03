import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface AdminDetailItem {
  readonly label: string;
  readonly value: ReactNode;
}

export function AdminDetailGrid({
  description,
  items,
  title,
}: {
  readonly description?: string;
  readonly items: readonly AdminDetailItem[];
  readonly title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description === undefined ? null : <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div key={item.label} className="flex min-w-0 flex-col gap-1">
              <dt className="text-xs font-medium text-muted-foreground">{item.label}</dt>
              <dd className="break-words text-sm font-medium">{item.value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

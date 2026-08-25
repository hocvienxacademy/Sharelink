import type { ReactNode } from "react";
import { InboxIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface AdminTableColumn<Key extends string = string> {
  readonly key: Key;
  readonly label: string;
}

export function AdminResourceTable<Key extends string>({
  columns,
  emptyDescription,
  rows,
}: {
  readonly columns: readonly AdminTableColumn<Key>[];
  readonly emptyDescription: string;
  readonly rows: readonly (Readonly<Record<Key, ReactNode>> & { readonly id: string | number })[];
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><InboxIcon aria-hidden="true" /></EmptyMedia>
              <EmptyTitle>Chưa có dữ liệu</EmptyTitle>
              <EmptyDescription>{emptyDescription}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <Table
          aria-label={emptyDescription}
          className="block w-full lg:table"
        >
          <TableHeader className="hidden lg:table-header-group">
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>
                  {column.label === "" ? <span className="sr-only">Thao tác</span> : column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="grid gap-3 p-3 lg:table-row-group lg:p-0">
            {rows.map((row) => (
              <TableRow
                key={String(row.id)}
                className="grid rounded-xl border bg-background p-1 hover:bg-background lg:table-row lg:rounded-none lg:border-x-0 lg:border-t-0 lg:bg-transparent lg:p-0 lg:hover:bg-muted/50"
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    data-label={column.label === "" ? "Thao tác" : column.label}
                    className="grid min-w-0 grid-cols-[minmax(6.5rem,0.45fr)_minmax(0,1fr)] items-start gap-3 border-b px-3 py-3 whitespace-normal break-words last:border-b-0 lg:table-cell lg:border-b-0 lg:p-2 lg:whitespace-nowrap [&_a]:break-words [&_[data-slot=button]]:w-full lg:[&_[data-slot=button]]:w-auto"
                  >
                    <span className="text-xs font-medium text-muted-foreground lg:hidden">
                      {column.label === "" ? "Thao tác" : column.label}
                    </span>
                    <div className="min-w-0">{row[column.key]}</div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

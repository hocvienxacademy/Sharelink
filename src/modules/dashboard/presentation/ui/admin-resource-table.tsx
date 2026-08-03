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
        <Table aria-label={emptyDescription}>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>
                  {column.label === "" ? <span className="sr-only">Thao tác</span> : column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={String(row.id)}>
                {columns.map((column) => <TableCell key={column.key}>{row[column.key]}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

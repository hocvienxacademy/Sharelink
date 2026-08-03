import type { ReactNode } from "react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function AdminPageHeader({
  action,
  description,
  parent,
  title,
}: {
  readonly action?: ReactNode;
  readonly description: string;
  readonly parent?: { readonly href: string; readonly label: string };
  readonly title: string;
}) {
  return (
    <header className="flex flex-col gap-5">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/quan-tri" />}>Quản trị</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {parent === undefined ? null : (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href={parent.href} />}>
                  {parent.label}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="max-w-3xl">
          <h1 className="font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
    </header>
  );
}

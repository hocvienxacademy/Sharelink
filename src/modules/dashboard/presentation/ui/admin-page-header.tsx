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
    <header className="flex min-w-0 flex-col gap-4 sm:gap-5">
      <Breadcrumb className="min-w-0 overflow-hidden">
        <BreadcrumbList className="flex-nowrap overflow-hidden">
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
            <BreadcrumbPage className="truncate">{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex min-w-0 flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="min-w-0 max-w-3xl">
          <h1 className="font-heading text-3xl font-semibold tracking-[-0.04em] break-words sm:text-5xl">
            {title}
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p>
        </div>
        {action === undefined ? null : (
          <div className="w-full shrink-0 md:w-auto [&>*]:w-full [&_[data-slot=button]]:w-full md:[&>*]:w-auto md:[&_[data-slot=button]]:w-auto">
            {action}
          </div>
        )}
      </div>
    </header>
  );
}

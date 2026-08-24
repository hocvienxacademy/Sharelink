import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  imageClassName,
  textClassName,
}: {
  readonly className?: string;
  readonly imageClassName?: string;
  readonly textClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <Image
        src="/images/logoTVU.jpg"
        alt="Logo Đại học Trà Vinh"
        width={2560}
        height={2560}
        className={cn("size-10 shrink-0 rounded-full object-contain", imageClassName)}
        priority
      />
      <span className={cn("font-semibold tracking-tight", textClassName)}>
        ĐẠI HỌC TRÀ VINH
      </span>
    </span>
  );
}

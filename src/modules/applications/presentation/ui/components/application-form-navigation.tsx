import type { ComponentProps, ReactNode } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  RefreshCwIcon,
  SendIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

function NavigationButton(props: ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      className="min-h-11 w-full min-[480px]:w-auto"
      {...props}
    />
  );
}

function BusyIcon({
  busy,
  children,
}: {
  readonly busy: boolean;
  readonly children: ReactNode;
}) {
  return busy ? <Spinner data-icon="inline-start" /> : children;
}

export function ApplicationFormNavigation({
  isFirstPage,
  isLastPage,
  isRequesting,
  onPrevious,
  onNext,
  onSubmit,
  onReload,
}: {
  readonly isFirstPage: boolean;
  readonly isLastPage: boolean;
  readonly isRequesting: boolean;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly onSubmit: () => void;
  /** Shown only after a concurrency conflict. */
  readonly onReload?: () => void;
}) {
  return (
    <CardFooter className="flex flex-col items-stretch gap-3 min-[480px]:flex-row min-[480px]:flex-wrap min-[480px]:items-center min-[480px]:justify-between">
      <div className="grid w-full grid-cols-1 gap-2 min-[480px]:flex min-[480px]:w-auto min-[480px]:flex-wrap">
        {!isFirstPage && (
          <NavigationButton
            variant="outline"
            disabled={isRequesting}
            onClick={onPrevious}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Trang trước
          </NavigationButton>
        )}
        {onReload !== undefined && (
          <NavigationButton
            variant="outline"
            disabled={isRequesting}
            onClick={onReload}
          >
            <RefreshCwIcon data-icon="inline-start" />
            Tải lại hồ sơ
          </NavigationButton>
        )}
      </div>

      <div
        className={cn(
          "grid w-full grid-cols-1 gap-2",
          !isFirstPage &&
            "min-[480px]:flex min-[480px]:w-auto min-[480px]:flex-wrap min-[480px]:justify-end",
        )}
      >
        {isLastPage ? (
          <NavigationButton disabled={isRequesting} onClick={onSubmit}>
            <BusyIcon busy={isRequesting}>
              <SendIcon data-icon="inline-start" />
            </BusyIcon>
            Nộp hồ sơ
          </NavigationButton>
        ) : (
          <NavigationButton disabled={isRequesting} onClick={onNext}>
            <BusyIcon busy={isRequesting}>
              <ArrowRightIcon data-icon="inline-end" />
            </BusyIcon>
            Trang sau
          </NavigationButton>
        )}
      </div>
    </CardFooter>
  );
}

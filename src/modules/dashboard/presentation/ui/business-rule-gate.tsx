import { LockKeyholeIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function BusinessRuleGate({ children }: { readonly children: string }) {
  return (
    <Alert>
      <LockKeyholeIcon aria-hidden="true" />
      <AlertTitle>Chức năng thay đổi dữ liệu chưa được bật</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

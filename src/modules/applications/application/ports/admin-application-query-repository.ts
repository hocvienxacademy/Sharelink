import type { StaffApplicationAuthorizationResource } from "../authorization/staff-application-authorization";
import type { AdminApplicationDetail, AdminApplicationListItem } from "../dto/admin-application-dto";

export type ApplicationQueryScope =
  | { readonly kind: "all" }
  | { readonly kind: "sale"; readonly saleId: string }
  | { readonly kind: "manager"; readonly managerId: string };

export interface AdminApplicationQueryRepository {
  findAuthorizationResource(id: string): Promise<StaffApplicationAuthorizationResource | null>;
  findDetail(id: string, scope: ApplicationQueryScope): Promise<AdminApplicationDetail | null>;
  list(scope: ApplicationQueryScope): Promise<readonly AdminApplicationListItem[]>;
}

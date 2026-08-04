import { catalogAdministration } from "@/composition/catalogs";
import { createCatalogMutationHandler } from "@/modules/catalogs/presentation/http/admin-catalog-handlers";
export const POST = createCatalogMutationHandler((actor, id, input, context) => catalogAdministration.transitionAdmissionPeriod(actor, id, false, input, context), "admin-admission-period-deactivate");

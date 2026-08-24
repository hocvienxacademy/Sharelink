import { createCatalogMutationHandler } from "@/modules/catalogs/presentation/http/admin-catalog-handlers";
import { ConflictError } from "@/shared/errors";

export const POST = createCatalogMutationHandler(async () => {
  throw new ConflictError("Kỳ tuyển sinh đã chuyển sang chế độ lịch sử chỉ đọc.");
}, "admin-admission-period-activate");

export { DownloadApplicationWord } from "./application/word-export-service";
export type { WordDownload } from "./application/word-export-service";
export { DocxTemplateGenerator } from "./infrastructure/docx-template-generator";
export { PrismaWordExportRepository } from "./infrastructure/prisma-word-export-repository";
export {
  createStaffWordExportHandler,
  createStudentWordExportHandler,
} from "./presentation/http/word-export-handler";

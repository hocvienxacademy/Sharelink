import {
  DocxTemplateGenerator,
  DownloadApplicationWord,
  PrismaWordExportRepository,
} from "@/modules/word-export";

export const downloadApplicationWord = new DownloadApplicationWord(
  new PrismaWordExportRepository(),
  new DocxTemplateGenerator(),
);

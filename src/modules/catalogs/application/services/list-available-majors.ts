import type { CatalogRepository } from "../../domain/catalog-repository";
import type { MajorItemDto } from "../dto/catalog-dto";
import { toMajorItemDto } from "../mappers/catalog-mapper";

export class ListAvailableMajors {
  constructor(private readonly catalogRepository: CatalogRepository) {}

  async execute(): Promise<readonly MajorItemDto[]> {
    const majors = await this.catalogRepository.listActiveMajors();
    return majors.map(toMajorItemDto);
  }
}

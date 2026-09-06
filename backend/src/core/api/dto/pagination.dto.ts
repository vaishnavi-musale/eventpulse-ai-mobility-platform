// §35 — shared API DTOs (validation boundary).
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class PaginationDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  page = 0;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize = 50;
}

import { ApiProperty } from "@nestjs/swagger";

export class ApiPaginationDto {
  @ApiProperty({ required: false })
  readonly totalSegments?: number;
  @ApiProperty({ required: false, type: [Object] })
  readonly segmentBreakdown?: Array<{ segmentCount: number; messageCount: number; totalSegments: number }>;
  @ApiProperty({ required: false, type: Object, description: "Counts across the full filtered result set, before pagination." })
  readonly statusCounts?: Record<string, number>;

  @ApiProperty()
  readonly page!: number;

  @ApiProperty()
  readonly pageSize!: number;

  @ApiProperty()
  readonly totalItems!: number;

  @ApiProperty()
  readonly totalPages!: number;

  @ApiProperty()
  readonly hasNext!: boolean;

  @ApiProperty()
  readonly hasPrevious!: boolean;
}
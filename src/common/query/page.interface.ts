export interface Page<T> {
  readonly items: readonly T[];

  readonly page: number;

  readonly pageSize: number;

  readonly totalItems: number;

  readonly totalSegments?: number;
  readonly segmentBreakdown?: Array<{ segmentCount: number; messageCount: number; totalSegments: number }>;

  readonly statusCounts?: Record<string, number>;
}

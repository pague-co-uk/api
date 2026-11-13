export interface SmsSegmentBreakdown { segmentCount: number; messageCount: number; totalSegments: number; }

/** Count SMS parts from messages, never from routing attempts or retries. */
export function smsSegmentSummary(rows: ReadonlyArray<{ segmentCount?: number; _count: { _all: number } }>) {
  const counts = new Map<number, number>();
  for (const row of rows) {
    const segments = row.segmentCount ?? 1;
    counts.set(segments, (counts.get(segments) ?? 0) + row._count._all);
  }
  const segmentBreakdown: SmsSegmentBreakdown[] = [...counts].sort(([a], [b]) => a - b).map(([segmentCount, messageCount]) => ({ segmentCount, messageCount, totalSegments: segmentCount * messageCount }));
  return { totalSegments: segmentBreakdown.reduce((total, row) => total + row.totalSegments, 0), segmentBreakdown };
}

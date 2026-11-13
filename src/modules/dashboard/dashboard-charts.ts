import type { DashboardDateRange } from '../../repositories/options/dashboard.options.js';
import type { DashboardNetworkSeries } from './types/dashboard.types.js';

export function buildNetworkActivity(
  rows: Array<{
    date: Date;
    networkKey: string;
    networkName: string;
    count: bigint;
  }>,
  period: DashboardDateRange,
): DashboardNetworkSeries[] {
  const dates: string[] = [];
  const end = period.end.toISOString().slice(0, 10);
  for (
    const day = new Date(
      `${period.start.toISOString().slice(0, 10)}T00:00:00Z`,
    );
    day.toISOString().slice(0, 10) <= end;
    day.setUTCDate(day.getUTCDate() + 1)
  )
    dates.push(day.toISOString().slice(0, 10));
  const groups = new Map<
    string,
    { name: string; counts: Map<string, number> }
  >();
  for (const row of rows) {
    const group = groups.get(row.networkKey) ?? {
      name: row.networkName,
      counts: new Map<string, number>(),
    };
    const date = row.date.toISOString().slice(0, 10);
    group.counts.set(date, (group.counts.get(date) ?? 0) + Number(row.count));
    groups.set(row.networkKey, group);
  }
  return [...groups.entries()]
    .map(([key, group]) => ({
      key,
      name: group.name,
      points: dates.map((date) => ({
        date,
        count: group.counts.get(date) ?? 0,
      })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function buildMonthlyOutcomes(
  rows: Array<{ month: number | bigint | string; delivered: bigint | number | string; failed: bigint | number | string }>,
) {
  return Array.from({ length: 12 }, (_, index) => {
    // Raw MySQL/MariaDB scalar types vary by server/driver. A TS annotation does not coerce them.
    const row = rows.find((row) => Number(row.month) === index + 1);
    return {
      month: index + 1,
      delivered: Number(row?.delivered ?? 0),
      failed: Number(row?.failed ?? 0),
    };
  });
}

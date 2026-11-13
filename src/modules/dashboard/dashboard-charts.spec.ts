import { describe, expect, it } from '@jest/globals';
import {
  buildNetworkActivity,
  buildMonthlyOutcomes,
} from './dashboard-charts.js';

describe('dashboard activity charts', () => {
  it('fills missing days independently for each named network including unassigned traffic', () => {
    const rows = [
      {
        date: new Date('2026-11-01T00:00:00Z'),
        networkKey: 'airtel',
        networkName: 'Airtel (MW)',
        count: 3n,
      },
      {
        date: new Date('2026-11-03T00:00:00Z'),
        networkKey: 'airtel',
        networkName: 'Airtel (MW)',
        count: 5n,
      },
      {
        date: new Date('2026-11-02T00:00:00Z'),
        networkKey: 'unassigned',
        networkName: 'Unassigned',
        count: 2n,
      },
    ];
    const series = buildNetworkActivity(rows, {
      start: new Date('2026-11-01T00:00:00Z'),
      end: new Date('2026-11-03T23:00:00Z'),
    });
    expect(series.map((network) => network.name)).toEqual([
      'Airtel (MW)',
      'Unassigned',
    ]);
    expect(series[0].points.map((point) => point.count)).toEqual([3, 0, 5]);
    expect(series[1].points.map((point) => point.count)).toEqual([0, 2, 0]);
    expect(
      series
        .flatMap((network) => network.points)
        .reduce((sum, point) => sum + point.count, 0),
    ).toBe(10);
  });
  it('does not invent networks for an empty period', () => {
    expect(
      buildNetworkActivity([], {
        start: new Date('2026-11-01Z'),
        end: new Date('2026-11-03Z'),
      }),
    ).toEqual([]);
  });
  it('returns twelve ordered months with zeros for missing outcomes', () => {
    const months = buildMonthlyOutcomes([
      { month: 2, delivered: 64n, failed: 20n },
      { month: 11, delivered: 5n, failed: 1n },
    ]);
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ month: 1, delivered: 0, failed: 0 });
    expect(months[1]).toEqual({ month: 2, delivered: 64, failed: 20 });
    expect(months[10]).toEqual({ month: 11, delivered: 5, failed: 1 });
    expect(months[11]).toEqual({ month: 12, delivered: 0, failed: 0 });
  });
});

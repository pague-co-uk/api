import { BadRequestException } from "@nestjs/common";

/** Date-only UI filters use Africa/Blantyre (UTC+02:00, no DST). */
export function messageDateRange(input: { createdFrom?: string; createdTo?: string }) {
  function boundary(value: string | undefined, end: boolean): Date | undefined {
    if (!value) return undefined;
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    if (!dateOnly && !/(Z|[+-]\d{2}:\d{2})$/i.test(value)) {
      throw new BadRequestException("Date/time filters must include a timezone.");
    }
    const date = new Date(dateOnly ? `${value}T00:00:00+02:00` : value);
    if (!Number.isFinite(+date) || (dateOnly && new Date(+date + 7200000).toISOString().slice(0, 10) !== value)) {
      throw new BadRequestException("Invalid message date filter.");
    }
    return new Date(+date + (dateOnly && end ? 86400000 : 0));
  }
  const createdFrom = boundary(input.createdFrom, false);
  const createdTo = boundary(input.createdTo, true);
  if (createdFrom && createdTo && createdFrom >= createdTo) {
    throw new BadRequestException("Created from must not be later than created to.");
  }
  return { createdFrom, createdTo };
}

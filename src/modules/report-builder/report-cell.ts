/** Excel only retains 15 significant numeric digits. Preserve larger values as text. */
export function excelValue(
  value: unknown,
  numeric: boolean,
  date: boolean,
): string | number | boolean | Date | null {
  if (value === null || value === undefined) return null;
  if (
    value instanceof Date ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
    return value;
  if (typeof value === 'bigint')
    return Number.isSafeInteger(Number(value)) &&
      value.toString().replace('-', '').length <= 15
      ? Number(value)
      : value.toString();
  if (typeof value === 'string') {
    if (
      numeric &&
      /^-?\d+(\.\d+)?$/.test(value) &&
      value.replace(/[-.]/g, '').replace(/^0+/, '').length <= 15
    ) {
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
    if (date && /^\d{4}-\d{2}-\d{2}(?:[T ][\d:.+Z-]+)?$/.test(value)) {
      const parsed = new Date(
        value.includes(' ') ? value.replace(' ', 'T') + 'Z' : value,
      );
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return value.slice(0, 32767);
  }
  // In particular, JSON objects with "formula" properties must remain literal text.
  return JSON.stringify(value).slice(0, 32767);
}

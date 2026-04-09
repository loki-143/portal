export type CsvPrimitive = string | number | boolean | null | undefined;
export type CsvRecord = Record<string, string>;
export type CsvRowInput = Record<string, CsvPrimitive>;

export function parseCsvRecords(raw: string): CsvRecord[] {
  const lines = raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headers = splitCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);

    return headers.reduce<CsvRecord>((row, header, index) => {
      row[header] = values[index] ?? "";
      return row;
    }, {});
  });
}

export function parseCsv<T>(
  raw: string,
  mapRow: (row: CsvRecord, index: number) => T,
): T[] {
  return parseCsvRecords(raw).map(mapRow);
}

export function serializeCsv(
  headers: string[],
  rows: CsvRowInput[],
): string {
  const headerLine = headers.map(escapeCsvValue).join(",");
  const dataLines = rows.map((row) =>
    headers.map((header) => escapeCsvValue(row[header])).join(","),
  );

  return [headerLine, ...dataLines].join("\n");
}

export function parseCsvList(
  value: string,
  delimiter = "|",
): string[] {
  if (!value.trim()) {
    return [];
  }

  if (value.trim().startsWith("[")) {
    return parseCsvJson<string[]>(value, []);
  }

  return value
    .split(delimiter)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function stringifyCsvList(
  values: string[],
  delimiter = "|",
): string {
  return values.join(delimiter);
}

export function parseCsvJson<T>(value: string, fallback: T): T {
  if (!value.trim()) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function stringifyCsvJson(value: unknown): string {
  return JSON.stringify(value);
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);
  return values;
}

function escapeCsvValue(value: CsvPrimitive): string {
  const normalized = value == null ? "" : String(value);

  if (
    normalized.includes(",") ||
    normalized.includes('"') ||
    normalized.includes("\n")
  ) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

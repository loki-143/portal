import fs from 'fs';

import type {
  Application,
  ApplicationStatus,
  Automation,
  AutomationType,
  Job,
  JobStatus,
  User,
  UserRole,
  UserStatus,
} from '../types';

export type CsvRow = Record<string, string>;
export type CsvKind = 'jobs' | 'applications' | 'users' | 'automations';

export type StoredUser = User & { passwordHash?: string };

function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

export function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
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

    if (character === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  if (inQuotes) {
    throw new Error('CSV parse error: unterminated quoted field');
  }

  values.push(current);
  return values;
}

function parseCsvRaw(rawInput: string): { headers: string[]; rows: CsvRow[] } {
  const raw = stripBom(rawInput);

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());

  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);

    return headers.reduce<CsvRow>((row, header, headerIndex) => {
      row[header] = values[headerIndex] ?? '';
      return row;
    }, {});
  });

  return { headers, rows };
}

export function parseCsv(raw: string): CsvRow[] {
  return parseCsvRaw(raw).rows;
}

function quoteCsvValue(value: string): string {
  if (/[,\n\r"]/g.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export function stringifyCsv(headers: string[], rows: Array<Record<string, unknown> | object>): string {
  const headerLine = headers.join(',');
  const lines = rows.map((row) =>
    headers
      .map((header) => {
        const value = (row as Record<string, unknown>)[header];
        return quoteCsvValue(value === undefined || value === null ? '' : String(value));
      })
      .join(','),
  );

  return [headerLine, ...lines].join('\n') + '\n';
}

function parseNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseIntStrict(value: string, fieldName: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`CSV parse error: invalid integer for ${fieldName}`);
  }

  return parsed;
}

function parseOptionalNumber(value: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseJobStatus(value: string): JobStatus {
  if (value === 'Active' || value === 'Draft' || value === 'Closed') {
    return value;
  }

  return 'Active';
}

function parseApplicationStatus(value: string): ApplicationStatus {
  if (value === 'Pending' || value === 'Shortlisted' || value === 'Rejected') {
    return value;
  }

  return 'Pending';
}

function parseUserRole(value: string): UserRole {
  if (value === 'admin' || value === 'recruiter') {
    return value;
  }

  return 'recruiter';
}

function parseUserStatus(value: string): UserStatus {
  if (value === 'Active' || value === 'Disabled' || value === 'Inactive') {
    return value;
  }

  return 'Active';
}

function parseAutomationType(value: string): AutomationType {
  if (value === 'Welcome' || value === 'Rejection' || value === 'Shortlist') {
    return value;
  }

  return 'Welcome';
}

function parseBoolean(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === '') {
    return false;
  }

  return false;
}

function toJob(row: CsvRow): Job {
  return {
    id: parseIntStrict(row.id, 'id'),
    title: row.title,
    department: row.department,
    location: row.location,
    status: parseJobStatus(row.status),
    applicants: parseNumber(row.applicants),
    newToday: parseNumber(row.newToday),
    postedDate: row.postedDate,
    timeToHireDays: parseOptionalNumber(row.timeToHireDays),
  };
}

function toApplication(row: CsvRow): Application {
  return {
    id: parseIntStrict(row.id, 'id'),
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    match: parseNumber(row.match),
    status: parseApplicationStatus(row.status),
    date: row.date,
    avatarSeed: row.avatarSeed,
  };
}

function toUser(row: CsvRow): StoredUser {
  return {
    id: parseIntStrict(row.id, 'id'),
    name: row.name,
    email: row.email,
    role: parseUserRole(row.role),
    status: parseUserStatus(row.status),
    initials: row.initials,
    color: row.color || undefined,
    passwordHash: row.passwordHash || undefined,
  };
}

function toAutomation(row: CsvRow): Automation {
  return {
    id: parseIntStrict(row.id, 'id'),
    type: parseAutomationType(row.type),
    template: row.template,
    enabled: parseBoolean(row.enabled),
  };
}

function inferKind(headers: string[]): CsvKind {
  const headerSet = new Set(headers);

  if (headerSet.has('department') && headerSet.has('applicants') && headerSet.has('postedDate')) {
    return 'jobs';
  }

  if (headerSet.has('phone') && headerSet.has('match') && headerSet.has('avatarSeed')) {
    return 'applications';
  }

  if (headerSet.has('initials') && headerSet.has('status') && headerSet.has('role')) {
    return 'users';
  }

  if (headerSet.has('template') && headerSet.has('enabled')) {
    return 'automations';
  }

  throw new Error(`CSV parse error: unable to infer CSV kind from headers: ${headers.join(', ')}`);
}

export function parseCsvFile(filePath: string): Job[] | Application[] | StoredUser[] | Automation[];
export function parseCsvFile(filePath: string, kind: 'jobs'): Job[];
export function parseCsvFile(filePath: string, kind: 'applications'): Application[];
export function parseCsvFile(filePath: string, kind: 'users'): StoredUser[];
export function parseCsvFile(filePath: string, kind: 'automations'): Automation[];
export function parseCsvFile(filePath: string, kind: CsvKind): Job[] | Application[] | StoredUser[] | Automation[];
export function parseCsvFile(filePath: string, kind?: CsvKind) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = parseCsvRaw(raw);

  const resolvedKind = kind ?? (parsed.headers.length > 0 ? inferKind(parsed.headers) : 'jobs');

  switch (resolvedKind) {
    case 'jobs':
      return parsed.rows.map(toJob);
    case 'applications':
      return parsed.rows.map(toApplication);
    case 'users':
      return parsed.rows.map(toUser);
    case 'automations':
      return parsed.rows.map(toAutomation);
    default: {
      const exhaustiveCheck: never = resolvedKind;
      return exhaustiveCheck;
    }
  }
}

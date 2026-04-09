import {
  Briefcase,
  LayoutGrid,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';
import applicationsCsv from './applications.csv?raw';
import jobsCsv from './jobs.csv?raw';

type CsvRow = Record<string, string>;

export type RecruiterJobStatus = 'Active' | 'Draft' | 'Closed';
export type RecruiterApplicationStatus = 'Pending' | 'Shortlisted' | 'Rejected';

type IconStyle = {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
};

export type RecruiterJob = {
  id: number;
  title: string;
  department: string;
  location: string;
  status: RecruiterJobStatus;
  applicants: number;
  newToday: number;
  postedOn: string | null;
  postedDateLabel: string;
  timeToHireDays: number | null;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
};

export type RecruiterApplication = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  match: number;
  status: RecruiterApplicationStatus;
  appliedOn: string;
  appliedDateLabel: string;
  avatar: string;
};

const jobIconStyles: Record<string, IconStyle> = {
  Design: {
    icon: LayoutGrid,
    iconBg: 'bg-primary-container/10',
    iconColor: 'text-primary-container',
  },
  Marketing: {
    icon: TrendingUp,
    iconBg: 'bg-error-container/30',
    iconColor: 'text-error',
  },
  People: {
    icon: Users,
    iconBg: 'bg-secondary-container/30',
    iconColor: 'text-secondary',
  },
};

function parseCsv(raw: string): CsvRow[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);

    return headers.reduce<CsvRow>((row, header, index) => {
      row[header] = values[index] ?? '';
      return row;
    }, {});
  });
}

function parseCsvLine(line: string): string[] {
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

  values.push(current);
  return values;
}

function parseNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOptionalNumber(value: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDateLabel(value: string): string {
  if (!value) {
    return '--';
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

function buildAvatarUrl(seed: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/100/100`;
}

function parseJobStatus(value: string): RecruiterJobStatus {
  if (value === 'Draft' || value === 'Closed') {
    return value;
  }

  return 'Active';
}

function parseApplicationStatus(value: string): RecruiterApplicationStatus {
  if (value === 'Shortlisted' || value === 'Rejected') {
    return value;
  }

  return 'Pending';
}

function getJobIconStyle(department: string): IconStyle {
  return jobIconStyles[department] ?? {
    icon: Briefcase,
    iconBg: 'bg-surface-container-high',
    iconColor: 'text-on-surface-variant',
  };
}

export const recruiterJobs: RecruiterJob[] = parseCsv(jobsCsv).map((row) => {
  const postedOn = row.postedDate || null;
  const iconStyle = getJobIconStyle(row.department);

  return {
    id: parseNumber(row.id),
    title: row.title,
    department: row.department,
    location: row.location,
    status: parseJobStatus(row.status),
    applicants: parseNumber(row.applicants),
    newToday: parseNumber(row.newToday),
    postedOn,
    postedDateLabel: formatDateLabel(row.postedDate),
    timeToHireDays: parseOptionalNumber(row.timeToHireDays),
    ...iconStyle,
  };
});

export const recruiterApplications: RecruiterApplication[] = parseCsv(applicationsCsv).map((row) => ({
  id: parseNumber(row.id),
  name: row.name,
  email: row.email,
  phone: row.phone,
  role: row.role,
  match: parseNumber(row.match),
  status: parseApplicationStatus(row.status),
  appliedOn: row.date,
  appliedDateLabel: formatDateLabel(row.date),
  avatar: buildAvatarUrl(row.avatarSeed || row.name.toLowerCase().replace(/\s+/g, '-')),
}));

const timeToHireSamples = recruiterJobs
  .map((job) => job.timeToHireDays)
  .filter((value): value is number => value !== null);

const shortlistedApplications = recruiterApplications.filter(
  (application) => application.status === 'Shortlisted',
);
const pendingApplications = recruiterApplications.filter(
  (application) => application.status === 'Pending',
);
const rejectedApplications = recruiterApplications.filter(
  (application) => application.status === 'Rejected',
);

export const recruiterMetrics = {
  totalJobs: recruiterJobs.length,
  activeJobs: recruiterJobs.filter((job) => job.status === 'Active').length,
  totalApplicants: recruiterJobs.reduce((total, job) => total + job.applicants, 0),
  newApplications: recruiterJobs.reduce((total, job) => total + job.newToday, 0),
  averageTimeToHireDays:
    timeToHireSamples.length > 0
      ? Math.round(
          timeToHireSamples.reduce((total, value) => total + value, 0) / timeToHireSamples.length,
        )
      : 0,
  totalApplications: recruiterApplications.length,
  shortlistedApplications: shortlistedApplications.length,
  pendingApplications: pendingApplications.length,
  rejectedApplications: rejectedApplications.length,
  averageMatchScore:
    recruiterApplications.length > 0
      ? Math.round(
          recruiterApplications.reduce((total, application) => total + application.match, 0) /
            recruiterApplications.length,
        )
      : 0,
  shortlistRate:
    recruiterApplications.length > 0
      ? Math.round((shortlistedApplications.length / recruiterApplications.length) * 100)
      : 0,
};

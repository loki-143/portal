export type JobStatus = 'Active' | 'Draft' | 'Closed';
export type ApplicationStatus = 'Pending' | 'Shortlisted' | 'Rejected';
export type UserRole = 'admin' | 'recruiter';
export type UserStatus = 'Active' | 'Disabled' | 'Inactive';

export interface Job {
  id: number;
  title: string;
  department: string;
  location: string;
  status: JobStatus;
  applicants: number;
  newToday: number;
  postedDate: string;
  timeToHireDays: number | null;
}

export interface Application {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  match: number;
  status: ApplicationStatus;
  date: string;
  avatarSeed: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  initials: string;
  color?: string;
}

export type AutomationType = 'Welcome' | 'Rejection' | 'Shortlist';

export interface Automation {
  id: number;
  type: AutomationType;
  template: string;
  enabled: boolean;
}

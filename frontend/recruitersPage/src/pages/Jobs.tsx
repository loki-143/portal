import { useState } from 'react';
import {
  Ban,
  Edit3,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import {
  recruiterApplications,
  recruiterJobs,
  recruiterMetrics,
  type RecruiterJobStatus,
} from '../data/recruiterSeed';
import { cn } from '../lib/utils';

/*
const jobs = [
  {
    id: 1,
    title: 'Senior UX Designer',
    department: 'Design',
    location: 'San Francisco, CA',
    status: 'Active',
    applicants: 128,
    newToday: 12,
    postedDate: 'Oct 12, 2023',
    icon: LayoutGrid,
    iconBg: 'bg-primary-container/10',
    iconColor: 'text-primary-container'
  },
  {
    id: 2,
    title: 'Product Manager',
    department: 'Product',
    location: 'Remote',
    status: 'Active',
    applicants: 84,
    newToday: 4,
    postedDate: 'Oct 08, 2023',
    icon: Briefcase,
    iconBg: 'bg-secondary-container/30',
    iconColor: 'text-secondary'
  },
  {
    id: 3,
    title: 'Lead Backend Engineer',
    department: 'Engineering',
    location: 'New York, NY',
    status: 'Draft',
    applicants: 0,
    newToday: 0,
    postedDate: '—',
    icon: Briefcase,
    iconBg: 'bg-surface-container-high',
    iconColor: 'text-on-surface-variant'
  },
  {
    id: 4,
    title: 'Growth Marketing Lead',
    department: 'Marketing',
    location: 'London, UK',
    status: 'Closed',
    applicants: 246,
    newToday: 0,
    postedDate: 'Aug 20, 2023',
    icon: TrendingUp,
    iconBg: 'bg-error-container/30',
    iconColor: 'text-error'
  }
];
*/

export default function Jobs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | RecruiterJobStatus>('All');

  const departments = Array.from(new Set(recruiterJobs.map((job) => job.department))).sort();
  const statusOptions: Array<'All' | RecruiterJobStatus> = ['All', 'Active', 'Draft', 'Closed'];
  const featuredApplications = recruiterApplications.slice(0, 2);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredJobs = recruiterJobs.filter((job) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      [job.title, job.department, job.location].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      );

    const matchesDepartment =
      selectedDepartment === 'All' || job.department === selectedDepartment;

    const matchesStatus = selectedStatus === 'All' || job.status === selectedStatus;

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <h1 className="display-md">Job Postings</h1>
          <p className="text-on-surface-variant font-medium">
            Managing locally seeded recruiter data from `jobs.csv`
          </p>
        </div>
        <Button className="hidden md:flex">
          <Plus className="w-4 h-4 mr-2" />
          Post New Job
        </Button>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="lowest" className="shadow-sm">
          <p className="label-md text-[10px] text-on-surface-variant/50 mb-4">Active Jobs</p>
          <div className="flex items-end justify-between">
            <span className="text-5xl font-black text-primary">{recruiterMetrics.activeJobs}</span>
            <span className="text-primary-container bg-primary-container/10 px-2 py-1 rounded text-[10px] font-bold">
              {recruiterMetrics.totalJobs} total seeded
            </span>
          </div>
        </Card>
        <Card variant="low">
          <p className="label-md text-[10px] text-on-surface-variant/50 mb-4">Total Applicants</p>
          <div className="flex items-end justify-between">
            <span className="text-5xl font-black text-secondary">
              {recruiterMetrics.totalApplicants.toLocaleString()}
            </span>
            <div className="flex -space-x-2">
              {featuredApplications.map((application) => (
                <img
                  key={application.id}
                  src={application.avatar}
                  alt={application.name}
                  className="w-8 h-8 rounded-full border-2 border-surface-container-low"
                  referrerPolicy="no-referrer"
                />
              ))}
              <div className="w-8 h-8 rounded-full bg-surface-container-high border-2 border-surface-container-low flex items-center justify-center text-[10px] font-bold">
                +{Math.max(recruiterMetrics.totalApplicants - featuredApplications.length, 0)}
              </div>
            </div>
          </div>
        </Card>
        <Card variant="lowest" className="shadow-sm">
          <p className="label-md text-[10px] text-on-surface-variant/50 mb-4">New Applications</p>
          <div className="flex items-end justify-between">
            <span className="text-5xl font-black text-primary">
              {recruiterMetrics.newApplications}
            </span>
            <TrendingUp className="w-8 h-8 text-primary-container" />
          </div>
        </Card>
        <Card variant="low">
          <p className="label-md text-[10px] text-on-surface-variant/50 mb-4">Time to Hire</p>
          <div className="flex items-end justify-between">
            <span className="text-5xl font-black text-secondary">
              {recruiterMetrics.averageTimeToHireDays}
            </span>
            <span className="text-[10px] font-bold text-on-surface-variant/50 mb-1">DAYS AVG.</span>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/40" />
          <input
            type="text"
            placeholder="Search job titles, keywords, or location..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-surface-container-lowest rounded-lg border-none shadow-sm focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedDepartment}
            onChange={(event) => setSelectedDepartment(event.target.value)}
            className="bg-surface-container-low border-none rounded-lg py-4 px-6 text-sm font-medium focus:ring-2 focus:ring-primary/10 appearance-none"
          >
            <option value="All">Department: All</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
          <div className="flex bg-surface-container-low p-1 rounded-full">
            {statusOptions.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setSelectedStatus(status)}
                className={cn(
                  'px-6 py-3 rounded-full text-sm font-bold transition-all',
                  selectedStatus === status
                    ? 'bg-primary-container text-on-primary'
                    : 'text-on-surface-variant/60 hover:bg-white/50',
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <Card variant="lowest" className="p-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-container-low">
                <th className="px-8 py-6 label-md text-[10px] text-on-surface-variant/50">Job Title & Department</th>
                <th className="px-8 py-6 label-md text-[10px] text-on-surface-variant/50">Status</th>
                <th className="px-8 py-6 label-md text-[10px] text-on-surface-variant/50">Applicants</th>
                <th className="px-8 py-6 label-md text-[10px] text-on-surface-variant/50">Posted Date</th>
                <th className="px-8 py-6 label-md text-[10px] text-on-surface-variant/50 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {filteredJobs.map((job) => (
                <tr key={job.id} className="group hover:bg-surface-container-low/30 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", job.iconBg, job.iconColor)}>
                        <job.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-lg font-bold group-hover:text-primary transition-colors">{job.title}</p>
                        <p className="text-sm text-on-surface-variant/60">
                          {job.department} / {job.location}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                      job.status === 'Active' ? "bg-primary-container/10 text-primary-container" : 
                      job.status === 'Draft' ? "bg-surface-container-high text-on-surface-variant/60" : 
                      "bg-error-container/30 text-error"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", 
                        job.status === 'Active' ? "bg-primary-container" : 
                        job.status === 'Draft' ? "bg-on-surface-variant/40" : 
                        "bg-error"
                      )} />
                      {job.status}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-primary hover:underline cursor-pointer">
                      {job.applicants.toLocaleString()} Applicants
                    </p>
                    {job.newToday > 0 && (
                      <p className="text-[10px] text-on-surface-variant/40 mt-1">{job.newToday} new today</p>
                    )}
                  </td>
                  <td className="px-8 py-6 text-sm text-on-surface-variant/60 font-medium">
                    {job.postedDateLabel}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-on-surface-variant/40 hover:text-primary transition-colors">
                        <Edit3 className="w-5 h-5" />
                      </button>
                      <button className="p-2 text-on-surface-variant/40 hover:text-primary transition-colors">
                        <Users className="w-5 h-5" />
                      </button>
                      {job.status === 'Closed' ? (
                        <button className="p-2 text-on-surface-variant/40 hover:text-primary transition-colors">
                          <RotateCcw className="w-5 h-5" />
                        </button>
                      ) : job.status === 'Draft' ? (
                        <button className="p-2 text-on-surface-variant/40 hover:text-error transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      ) : (
                        <button className="p-2 text-on-surface-variant/40 hover:text-error transition-colors">
                          <Ban className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-8 py-6 border-t border-surface-container-low flex items-center justify-between">
          <p className="text-sm text-on-surface-variant/60">
            Showing {filteredJobs.length} of {recruiterJobs.length} listings from `jobs.csv`
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="border border-outline-variant/30">Previous</Button>
            <Button variant="secondary" size="sm">Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

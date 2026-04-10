import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MapPin, Bold, Italic, List, Link2, Lightbulb, ChevronDown, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { jobsApi } from '../services/api';
import type { JobStatus, CreateJobRequest } from '../types';
import { useNavigate } from 'react-router-dom';
import { toast } from '../lib/toast';

export default function CreateJob() {
  const navigate = useNavigate();
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState('Full-time');
  const [description, setDescription] = useState('');
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);
  const [experienceMin, setExperienceMin] = useState('');
  const [experienceMax, setExperienceMax] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [initialStatus, setInitialStatus] = useState<JobStatus>('draft');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  async function submit(statusOverride?: JobStatus) {
    if (!title.trim()) {
      setError('Job title is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const status = statusOverride ?? initialStatus;

      const payload: CreateJobRequest = {
        title: title.trim(),
        company_name: companyName.trim() || undefined,
        department: department.trim() || undefined,
        location: location.trim() || undefined,
        type: type || undefined,
        description: description.trim() || undefined,
        required_skills: skills,
        preferred_skills: preferredSkills,
        experience_min_years: experienceMin ? parseInt(experienceMin) : undefined,
        experience_max_years: experienceMax ? parseInt(experienceMax) : undefined,
        salary_min: salaryMin ? parseFloat(salaryMin) : undefined,
        salary_max: salaryMax ? parseFloat(salaryMax) : undefined,
        status,
      };

      await jobsApi.create(payload);
      toast.success('Job created successfully', status === 'active' ? 'The job is now active and visible to candidates.' : 'The job has been saved as a draft.');
      navigate('/jobs');
    } catch (err) {
      toast.error('Failed to create job', (err as Error).message);
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <h1 className="display-md">Create New Job</h1>
          <p className="text-on-surface-variant font-medium">Design the next opportunity for our team.</p>
        </div>
        <div className="flex gap-4">
          <Button
            variant="ghost"
            className="bg-surface-container-low"
            onClick={() => submit('draft')}
            disabled={isSubmitting}
          >
            Save Draft
          </Button>
          <Button onClick={() => submit('active')} disabled={isSubmitting}>
            Post Job
          </Button>
        </div>
      </header>

      {error && (
        <Card variant="low" className="text-error">
          {error}
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Section 1: Job Details */}
          <Card className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary font-bold">1</div>
              <h2 className="text-xl font-bold tracking-tight">Job Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="label-md text-[10px] text-on-surface-variant/50">Job Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Frontend Engineer"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="label-md text-[10px] text-on-surface-variant/50">Company Name</label>
                <input
                  type="text"
                  placeholder="Coastal Seven"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="label-md text-[10px] text-on-surface-variant/50">Department</label>
                <div className="relative">
                  <select
                    className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 appearance-none"
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                  >
                    <option value="">Select Department</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Design">Design</option>
                    <option value="Product">Product</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Data">Data</option>
                    <option value="Human Resources">Human Resources</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="label-md text-[10px] text-on-surface-variant/50">Employment Type</label>
                <div className="relative">
                  <select
                    className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 appearance-none"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option>Full-time</option>
                    <option>Contract</option>
                    <option>Part-time</option>
                    <option>Internship</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="label-md text-[10px] text-on-surface-variant/50">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
                  <input
                    type="text"
                    placeholder="Remote / Bangalore, India"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-lg pl-12 pr-4 py-3 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label-md text-[10px] text-on-surface-variant/50">Min Experience (years)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={experienceMin}
                    onChange={(e) => setExperienceMin(e.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="label-md text-[10px] text-on-surface-variant/50">Max Experience (years)</label>
                  <input
                    type="number"
                    placeholder="10"
                    value={experienceMax}
                    onChange={(e) => setExperienceMax(e.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label-md text-[10px] text-on-surface-variant/50">Min Salary (₹)</label>
                  <input
                    type="number"
                    placeholder="1000000"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="label-md text-[10px] text-on-surface-variant/50">Max Salary (₹)</label>
                  <input
                    type="number"
                    placeholder="2000000"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20"
                    min="0"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Section 2: Description */}
          <Card className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary font-bold">2</div>
              <h2 className="text-xl font-bold tracking-tight">Description & Responsibilities</h2>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2 p-2 bg-surface-container-low rounded-t-lg">
                <button type="button" className="p-2 hover:bg-surface-container-highest rounded text-on-surface-variant/60 transition-colors"><Bold className="w-4 h-4" /></button>
                <button type="button" className="p-2 hover:bg-surface-container-highest rounded text-on-surface-variant/60 transition-colors"><Italic className="w-4 h-4" /></button>
                <button type="button" className="p-2 hover:bg-surface-container-highest rounded text-on-surface-variant/60 transition-colors"><List className="w-4 h-4" /></button>
                <button type="button" className="p-2 hover:bg-surface-container-highest rounded text-on-surface-variant/60 transition-colors"><Link2 className="w-4 h-4" /></button>
              </div>
              <textarea
                rows={8}
                placeholder="Tell us about the role, responsibilities, and what we're looking for..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-b-lg px-6 py-6 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              />
            </div>
          </Card>

          {/* Section 3: Skills */}
          <Card className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary font-bold">3</div>
              <h2 className="text-xl font-bold tracking-tight">Required Skills</h2>
            </div>

            <div className="space-y-6">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  placeholder="Add a required skill (e.g. React, Python)"
                  className="flex-1 bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20"
                />
                <Button variant="secondary" onClick={addSkill}>Add</Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {skills.length === 0 && (
                  <p className="text-sm text-on-surface-variant/50">No required skills added yet.</p>
                )}
                {skills.map(skill => (
                  <div key={skill} className="flex items-center gap-2 bg-primary-container/10 text-primary px-4 py-2 rounded-full font-bold text-sm">
                    {skill}
                    <button type="button" onClick={() => removeSkill(skill)} className="hover:text-error transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <Card className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary font-bold">4</div>
              <h2 className="text-xl font-bold tracking-tight">Post Settings</h2>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <label className="label-md text-[10px] text-on-surface-variant/50">Initial Status</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setInitialStatus('active')}
                    className={cn(
                      'flex-1 py-3 rounded-full font-bold text-sm transition-colors',
                      initialStatus === 'active'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-low text-on-surface-variant/60 hover:bg-surface-container-high',
                    )}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setInitialStatus('draft')}
                    className={cn(
                      'flex-1 py-3 rounded-full font-bold text-sm transition-colors',
                      initialStatus === 'draft'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-low text-on-surface-variant/60 hover:bg-surface-container-high',
                    )}
                  >
                    Draft
                  </button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="soul-gradient text-on-primary border-none">
            <Lightbulb className="w-8 h-8 mb-4 opacity-80" />
            <h3 className="text-xl font-bold mb-2">Pro Tip</h3>
            <p className="text-sm opacity-80 leading-relaxed">
              Jobs with detailed "Required Skills" receive 40% more qualified applicants. Be specific about your technology stack.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MapPin, Bold, Italic, List, Link2, Lightbulb, ChevronDown, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { jobsApi } from '../services/api';
import type { JobStatus } from '../types';
import { useNavigate } from 'react-router-dom';

export default function CreateJob() {
  const navigate = useNavigate();
  const [skills, setSkills] = useState(['TypeScript', 'Node.js', 'AWS Cloud', 'Agile Methodology']);
  const [newSkill, setNewSkill] = useState('');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [location, setLocation] = useState('');
  const [initialStatus, setInitialStatus] = useState<JobStatus>('Active');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addSkill = () => {
    if (newSkill && !skills.includes(newSkill)) {
      setSkills([...skills, newSkill]);
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  async function submit(statusOverride?: JobStatus) {
    try {
      setIsSubmitting(true);
      setError(null);

      const status = statusOverride ?? initialStatus;
      const postedDate = new Date().toISOString().slice(0, 10);

      await jobsApi.create({
        title: title.trim() || 'Untitled Role',
        department,
        location: location.trim() || 'Remote',
        status,
        applicants: 0,
        newToday: 0,
        postedDate,
        timeToHireDays: null,
      });

      navigate('/jobs');
    } catch (err) {
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
          <p className="text-on-surface-variant font-medium">Design the next opportunity for the Coastal Seven team.</p>
        </div>
        <div className="flex gap-4">
          <Button
            variant="ghost"
            className="bg-surface-container-low"
            onClick={() => submit('Draft')}
            disabled={isSubmitting}
          >
            Save Draft
          </Button>
          <Button onClick={() => submit('Active')} disabled={isSubmitting}>
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
                <label className="label-md text-[10px] text-on-surface-variant/50">Job Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Senior Frontend Engineer" 
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-DEFAULT px-4 py-3 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              
              <div className="space-y-2">
                <label className="label-md text-[10px] text-on-surface-variant/50">Department</label>
                <div className="relative">
                  <select
                    className="w-full bg-surface-container-low border-none rounded-DEFAULT px-4 py-3 focus:ring-2 focus:ring-primary/20 appearance-none"
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                  >
                    <option>Engineering</option>
                    <option>Design</option>
                    <option>Product</option>
                    <option>Marketing</option>
                    <option>Data</option>
                    <option>People</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="label-md text-[10px] text-on-surface-variant/50">Employment Type</label>
                <div className="relative">
                  <select className="w-full bg-surface-container-low border-none rounded-DEFAULT px-4 py-3 focus:ring-2 focus:ring-primary/20 appearance-none">
                    <option>Full-time</option>
                    <option>Contract</option>
                    <option>Part-time</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40 pointer-events-none" />
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="label-md text-[10px] text-on-surface-variant/50">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
                  <input 
                    type="text" 
                    placeholder="Remote / New York, NY" 
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-DEFAULT pl-12 pr-4 py-3 focus:ring-2 focus:ring-primary/20 transition-all"
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
              <div className="flex gap-2 p-2 bg-surface-container-low rounded-t-DEFAULT">
                <button className="p-2 hover:bg-surface-container-highest rounded text-on-surface-variant/60 transition-colors"><Bold className="w-4 h-4" /></button>
                <button className="p-2 hover:bg-surface-container-highest rounded text-on-surface-variant/60 transition-colors"><Italic className="w-4 h-4" /></button>
                <button className="p-2 hover:bg-surface-container-highest rounded text-on-surface-variant/60 transition-colors"><List className="w-4 h-4" /></button>
                <button className="p-2 hover:bg-surface-container-highest rounded text-on-surface-variant/60 transition-colors"><Link2 className="w-4 h-4" /></button>
              </div>
              <textarea 
                rows={8} 
                placeholder="Tell us about the role..." 
                className="w-full bg-surface-container-low border-none rounded-b-DEFAULT px-6 py-6 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              />
            </div>
          </Card>

          {/* Section 3: Skills */}
          <Card className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary font-bold">3</div>
              <h2 className="text-xl font-bold tracking-tight">Key Skills & Requirements</h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                  placeholder="Add a skill (e.g. React, Python)" 
                  className="flex-1 bg-surface-container-low border-none rounded-DEFAULT px-4 py-3 focus:ring-2 focus:ring-primary/20"
                />
                <Button variant="secondary" onClick={addSkill}>Add</Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {skills.map(skill => (
                  <div key={skill} className="flex items-center gap-2 bg-primary-container/10 text-primary px-4 py-2 rounded-full font-bold text-sm">
                    {skill}
                    <button onClick={() => removeSkill(skill)} className="hover:text-error transition-colors">
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
                    onClick={() => setInitialStatus('Active')}
                    className={cn(
                      'flex-1 py-3 rounded-full font-bold text-sm transition-colors',
                      initialStatus === 'Active'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-low text-on-surface-variant/60 hover:bg-surface-container-high',
                    )}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setInitialStatus('Draft')}
                    className={cn(
                      'flex-1 py-3 rounded-full font-bold text-sm transition-colors',
                      initialStatus === 'Draft'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-low text-on-surface-variant/60 hover:bg-surface-container-high',
                    )}
                  >
                    Draft
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="label-md text-[10px] text-on-surface-variant/50">Visibility</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 bg-surface-container-low rounded-DEFAULT cursor-pointer hover:bg-primary/5 transition-colors group">
                    <input type="radio" name="visibility" defaultChecked className="text-primary focus:ring-primary" />
                    <div>
                      <p className="font-bold text-sm">Public</p>
                      <p className="text-[10px] label-md text-on-surface-variant/40">Visible on careers page</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 bg-surface-container-low rounded-DEFAULT cursor-pointer hover:bg-primary/5 transition-colors group">
                    <input type="radio" name="visibility" className="text-primary focus:ring-primary" />
                    <div>
                      <p className="font-bold text-sm">Internal Only</p>
                      <p className="text-[10px] label-md text-on-surface-variant/40">Only visible to employees</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <label className="label-md text-[10px] text-on-surface-variant/50">Assignee</label>
                <div className="flex items-center gap-3 bg-surface-container-low p-3 rounded-DEFAULT">
                  <img src="https://picsum.photos/seed/alex/100/100" alt="Assignee" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                  <div className="flex-1">
                    <p className="font-bold text-sm">Alex Rivera</p>
                    <p className="text-[10px] label-md text-on-surface-variant/40">Hiring Manager</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-on-surface-variant/40" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="soul-gradient text-on-primary border-none">
            <Lightbulb className="w-8 h-8 mb-4 opacity-80" />
            <h3 className="text-xl font-bold mb-2">Pro Tip</h3>
            <p className="text-sm opacity-80 leading-relaxed">
              Jobs with detailed "Key Skills" receive 40% more qualified applicants. Be specific about your technology stack.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

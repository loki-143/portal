/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bell, 
  Settings, 
  Plus, 
  MoreVertical, 
  Eye, 
  Edit2, 
  CircleSlash, 
  Mail, 
  CheckCircle2,
  TrendingUp,
  Info,
  UserPlus,
  Search,
  ChevronDown
} from "lucide-react";

type View = 'portal' | 'add-hr';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Disabled' | 'Inactive';
  initials: string;
  color?: string;
}

const TopNav = ({ currentView, setView }: { currentView: View, setView: (v: View) => void }) => (
  <nav className="fixed top-0 w-full z-50 glass shadow-luminous">
    <div className="flex justify-between items-center px-8 h-16 w-full max-w-screen-2xl mx-auto">
      <div className="flex items-center gap-8">
        <button 
          onClick={() => setView('portal')}
          className="text-xl font-bold bg-gradient-to-br from-primary to-teal-accent bg-clip-text text-transparent tracking-tight hover:opacity-80 transition-opacity"
        >
          Coastal Seven
        </button>
        <div className="hidden md:flex items-center gap-6">
          {["Home", "Applications", "Dashboard"].map((item) => (
            <a key={item} href="#" className="text-on-surface-variant hover:text-primary transition-colors text-sm font-medium">
              {item}
            </a>
          ))}
          <button 
            onClick={() => setView('portal')}
            className={`text-sm font-medium pb-1 transition-all ${currentView === 'portal' ? 'text-primary font-semibold border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Admin
          </button>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-surface-container-low rounded-full transition-all">
          <Bell className="w-5 h-5 text-on-surface-variant" />
        </button>
        <button className="p-2 hover:bg-surface-container-low rounded-full transition-all">
          <Settings className="w-5 h-5 text-on-surface-variant" />
        </button>
        <div className="w-8 h-8 rounded-full overflow-hidden border border-on-surface-variant/30">
          <img 
            src="https://picsum.photos/seed/profile/100/100" 
            alt="Profile" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  </nav>
);

const AdminPortal: React.FC<{ 
  onAddHR: () => void, 
  users: User[],
  onToggleStatus: (id: string) => void,
  onDelete: (id: string) => void,
  onEdit: (user: User) => void,
  onView: (user: User) => void
}> = ({ onAddHR, users, onToggleStatus, onDelete, onEdit, onView }) => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    className="w-full"
  >
    <header className="mb-12 pt-24">
      <h1 className="text-[3.5rem] font-bold tracking-tight text-on-surface leading-none mb-4">
        Admin Portal
      </h1>
      <p className="text-on-surface-variant text-lg max-w-2xl">
        Luminous command center for system-level precision. Manage core infrastructure, job definitions, and high-level analytics.
      </p>
    </header>

    <div className="grid grid-cols-12 gap-8">
      <div className="col-span-12 lg:col-span-8">
        <StatsGrid />
        <UserManagement 
          onAddHR={onAddHR} 
          users={users} 
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
          onEdit={onEdit}
          onView={onView}
        />
      </div>
      <aside className="col-span-12 lg:col-span-4">
        <JobManagement />
        <EmailAutomations />
      </aside>
    </div>
  </motion.div>
);

const AddHRView: React.FC<{ 
  users: User[],
  onToggleStatus: (id: string) => void,
  onEdit: (user: User) => void
}> = ({ users, onToggleStatus, onEdit }) => (
  <motion.div 
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="w-full pt-24"
  >
    <header className="max-w-2xl mb-12">
      <h1 className="text-4xl font-extrabold tracking-tight text-on-surface mb-2">Add HR</h1>
      <p className="text-on-surface-variant text-lg">Create and manage HR accounts for the Coastal Seven ecosystem.</p>
    </header>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12">
      {/* Left Column: Form */}
      <section className="lg:col-span-7 bg-surface-container-lowest rounded-lg p-10 shadow-luminous relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <UserPlus className="w-32 h-32 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-8 text-on-surface">Account Details</h2>
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Full Name</label>
              <input className="w-full px-5 py-3 bg-surface-container-low border-none rounded-DEFAULT focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all outline-none" placeholder="Johnathan Doe" type="text"/>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Email Address</label>
              <input className="w-full px-5 py-3 bg-surface-container-low border-none rounded-DEFAULT focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all outline-none" placeholder="john@coastalseven.com" type="email"/>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Contact Number</label>
              <input className="w-full px-5 py-3 bg-surface-container-low border-none rounded-DEFAULT focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all outline-none" placeholder="+1 (555) 000-0000" type="tel"/>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Role</label>
              <div className="relative">
                <select className="w-full px-5 py-3 bg-surface-container-low border-none rounded-DEFAULT focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all appearance-none outline-none">
                  <option>HR</option>
                  <option>Recruiter</option>
                  <option>Talent Acquisition</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Password</label>
              <input className="w-full px-5 py-3 bg-surface-container-low border-none rounded-DEFAULT focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all outline-none" placeholder="••••••••" type="password"/>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Confirm Password</label>
              <input className="w-full px-5 py-3 bg-surface-container-low border-none rounded-DEFAULT focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all outline-none" placeholder="••••••••" type="password"/>
            </div>
          </div>
          <div className="pt-6">
            <button className="w-full md:w-auto px-10 py-4 soul-gradient text-on-primary font-bold rounded-xl shadow-lg hover:shadow-primary/20 transition-all active:scale-95">
              Create HR Account
            </button>
          </div>
        </form>
      </section>

      {/* Right Column: Context/Stats */}
      <aside className="lg:col-span-5 space-y-6">
        <div className="bg-primary-container/20 border border-primary/10 p-8 rounded-lg">
          <Info className="w-8 h-8 text-primary mb-4" />
          <h3 className="text-xl font-bold text-on-primary-container mb-2">Platform Access</h3>
          <p className="text-on-primary-container/80 text-sm leading-relaxed">
            Newly created HR accounts will have immediate access to recruitment tools, applicant tracking, and employee onboarding modules. They will receive an invitation email to set their secondary verification.
          </p>
        </div>
        <div className="relative rounded-lg overflow-hidden h-64 shadow-ambient group">
          <img 
            src="https://picsum.photos/seed/team/800/600" 
            alt="Team" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
            <span className="text-white text-xs font-bold uppercase tracking-widest mb-1">Company Culture</span>
            <h4 className="text-white font-bold text-lg">Building the Future Together</h4>
          </div>
        </div>
      </aside>
    </div>

    {/* Section: Existing HRs */}
    <section className="space-y-6 mb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 px-2">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">Existing HR Personnel</h2>
          <p className="text-on-surface-variant text-sm">Manage active and inactive administrative accounts.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-full w-full sm:w-auto">
          <Search className="w-4 h-4 text-on-surface-variant" />
          <input className="bg-transparent border-none focus:ring-0 text-sm w-full sm:w-40 outline-none" placeholder="Search accounts..." type="text"/>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-lg shadow-luminous border border-on-surface-variant/5 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-surface-container-low/50">
            <tr>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Name</th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Email</th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-on-surface-variant/5">
            {users.filter(u => u.role === 'HR').map((hr, i) => (
              <tr key={hr.id} className="group hover:bg-surface-container-low/30 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${hr.color || 'bg-primary/10 text-primary'}`}>
                      {hr.initials}
                    </div>
                    <span className="font-semibold text-on-surface">{hr.name}</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-on-surface-variant">{hr.email}</td>
                <td className="px-8 py-6">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                    hr.status === "Active" ? 'bg-primary-container/30 text-on-primary-container' : 'bg-surface-container-highest text-on-surface-variant'
                  }`}>
                    {hr.status}
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onEdit(hr)}
                      className="p-2 hover:bg-surface-container-highest rounded-lg text-primary transition-all"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => onToggleStatus(hr.id)}
                      className={`p-2 hover:bg-surface-container-highest rounded-lg transition-all ${hr.status === 'Active' ? 'text-red-500' : 'text-primary'}`}
                    >
                      {hr.status === 'Active' ? <CircleSlash className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  </motion.div>
);

const StatsGrid = () => (
  <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
    {/* Live Performance Card */}
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-surface-container-lowest p-8 rounded-lg shadow-luminous relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <TrendingUp className="w-32 h-32" />
      </div>
      <label className="block text-[10px] uppercase tracking-[0.1em] font-bold text-primary mb-4">
        Live Performance
      </label>
      <h3 className="text-xl font-bold mb-6">Applications per day</h3>
      <div className="flex items-end gap-2 h-32 mb-4">
        {[40, 65, 45, 85, 60, 95, 70].map((h, i) => (
          <div 
            key={i}
            className={`w-full rounded-t-lg transition-all duration-500 ${i === 5 ? 'bg-primary' : 'bg-primary-container/30'}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-on-surface-variant font-medium">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
          <span key={day}>{day}</span>
        ))}
      </div>
    </motion.div>

    {/* Neural Engine Card */}
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 }}
      className="bg-surface-container-lowest p-8 rounded-lg shadow-luminous flex flex-col justify-between"
    >
      <div>
        <label className="block text-[10px] uppercase tracking-[0.1em] font-bold text-primary mb-4">
          Neural Engine
        </label>
        <h3 className="text-xl font-bold">AI Accuracy Rate</h3>
      </div>
      <div className="py-4 flex justify-center">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="none" className="stroke-surface-container-highest" strokeWidth="3" />
            <circle 
              cx="18" cy="18" r="16" fill="none" 
              className="stroke-primary" 
              strokeWidth="3" 
              strokeDasharray="100" 
              strokeDashoffset="2"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-extrabold text-on-surface">
              98<span className="text-lg font-medium text-on-surface-variant">%</span>
            </span>
          </div>
        </div>
      </div>
      <p className="text-sm text-on-surface-variant text-center">
        Optimized precision through Luminous AI models.
      </p>
    </motion.div>
  </section>
);

const UserManagement: React.FC<{ 
  onAddHR: () => void,
  users: User[],
  onToggleStatus: (id: string) => void,
  onDelete: (id: string) => void,
  onEdit: (user: User) => void,
  onView: (user: User) => void
}> = ({ onAddHR, users, onToggleStatus, onDelete, onEdit, onView }) => (
  <section className="bg-surface-container-lowest rounded-lg overflow-hidden shadow-luminous mb-8">
    <div className="p-8 border-b border-on-surface-variant/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <h2 className="text-2xl font-bold">User Management</h2>
      <div className="flex flex-wrap gap-2">
        <button className="px-4 py-2 bg-surface-container-low text-on-surface font-medium rounded-lg hover:bg-surface-container-highest transition-colors text-sm">
          Manage Recruiters
        </button>
        <button 
          onClick={onAddHR}
          className="px-4 py-2 bg-teal-accent text-white font-medium rounded-lg hover:opacity-90 transition-opacity text-sm"
        >
          Add HR
        </button>
        <button className="px-4 py-2 bg-primary text-on-primary font-medium rounded-lg hover:opacity-90 transition-opacity text-sm">
          Add System Admin
        </button>
      </div>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-container-low/50">
            <th className="px-8 py-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">User Identity</th>
            <th className="px-8 py-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Role</th>
            <th className="px-8 py-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Status</th>
            <th className="px-8 py-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-on-surface-variant/5">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-surface-container-low/30 transition-colors">
              <td className="px-8 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-primary font-bold">
                    {user.initials}
                  </div>
                  <div>
                    <div className="font-bold text-on-surface">{user.name}</div>
                    <div className="text-xs text-on-surface-variant">{user.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-8 py-4 text-sm font-medium">{user.role}</td>
              <td className="px-8 py-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  user.status === "Active" ? 'bg-primary-container/30 text-on-primary-container' : 'bg-surface-container-highest text-on-surface-variant'
                }`}>
                  {user.status}
                </span>
              </td>
              <td className="px-8 py-4 text-right">
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => onView(user)}
                    className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onEdit(user)}
                    className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onToggleStatus(user.id)}
                    className={`p-2 transition-colors ${user.status === 'Active' ? 'text-on-surface-variant hover:text-red-500' : 'text-primary hover:opacity-80'}`}
                  >
                    {user.status === 'Active' ? <CircleSlash className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

const JobManagement = () => (
  <section className="bg-surface-container-lowest p-8 rounded-lg shadow-luminous mb-8">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-bold">Job Management</h2>
      <button className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center hover:scale-105 transition-transform shadow-lg">
        <Plus className="w-6 h-6" />
      </button>
    </div>
    <div className="space-y-4">
      {[
        "Senior Cloud Architect",
        "Lead Frontend Engineer",
        "Technical Product Manager"
      ].map((job, i) => (
        <div 
          key={i} 
          className="p-4 bg-surface-container-low rounded-lg group hover:bg-white hover:shadow-ambient transition-all border border-transparent hover:border-primary/10"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-primary">{job}</span>
            <button className="text-on-surface-variant hover:text-primary transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-4">
            <button className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">Edit</button>
            <button className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-red-500 transition-colors">Archive</button>
          </div>
        </div>
      ))}
    </div>
  </section>
);

const EmailAutomations = () => (
  <section className="bg-primary p-8 rounded-lg text-on-primary shadow-ambient relative overflow-hidden">
    <div className="relative z-10">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <Mail className="w-5 h-5" />
        Email Automations
      </h2>
      <div className="space-y-6">
        <div>
          <label className="block text-[10px] uppercase font-bold tracking-widest mb-2 opacity-80">Rejection Template</label>
          <textarea 
            className="w-full bg-white/10 border-none rounded-lg text-sm p-4 h-24 focus:ring-2 focus:ring-white/30 text-white placeholder-white/40 mb-3 resize-none outline-none" 
            placeholder="Enter rejection message..."
          />
          <button className="w-full bg-white text-primary font-bold py-2 rounded-lg text-sm hover:bg-on-primary transition-colors">
            Update Rejection
          </button>
        </div>
        <div className="border-t border-white/10 pt-6">
          <label className="block text-[10px] uppercase font-bold tracking-widest mb-2 opacity-80">Interview Invitation</label>
          <textarea 
            className="w-full bg-white/10 border-none rounded-lg text-sm p-4 h-24 focus:ring-2 focus:ring-white/30 text-white placeholder-white/40 mb-3 resize-none outline-none" 
            placeholder="Enter invitation message..."
          />
          <button className="w-full bg-white text-primary font-bold py-2 rounded-lg text-sm hover:bg-on-primary transition-colors">
            Update Invitation
          </button>
        </div>
      </div>
    </div>
    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
  </section>
);

const Footer = () => (
  <footer className="w-full border-t border-on-surface-variant/10 bg-surface-container-low/30 mt-12">
    <div className="flex flex-col md:flex-row justify-between items-center px-8 py-12 w-full max-w-screen-2xl mx-auto">
      <div className="mb-8 md:mb-0">
        <span className="font-bold text-on-surface block mb-2">Coastal Seven</span>
        <p className="text-on-surface-variant text-sm tracking-wide">
          © 2024 Coastal Seven. Luminous Precision Engineering.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-8">
        {["Privacy Policy", "Terms of Service", "Documentation", "Support"].map(link => (
          <a key={link} href="#" className="text-on-surface-variant hover:text-primary transition-all text-sm tracking-wide">
            {link}
          </a>
        ))}
      </div>
    </div>
  </footer>
);

export default function App() {
  const [view, setView] = useState<View>('portal');
  const [users, setUsers] = useState<User[]>([
    { id: '1', name: "Julianne Davenport", email: "j.davenport@coastal7.io", role: "HR", status: "Active", initials: "JD" },
    { id: '2', name: "Marcus Kinsley", email: "m.kinsley@talentforce.com", role: "HR", status: "Active", initials: "MK" },
    { id: '3', name: "Elena Rodriguez", email: "e.rod@globaltech.net", role: "HR", status: "Disabled", initials: "ER" },
    { id: '4', name: "Sarah Miller", email: "sarah.m@coastalseven.com", role: "HR", status: "Active", initials: "SM", color: "bg-primary/10 text-primary" },
    { id: '5', name: "Robert Kincaid", email: "r.kincaid@coastalseven.com", role: "HR", status: "Inactive", initials: "RK", color: "bg-teal-accent/10 text-teal-accent" },
    { id: '6', name: "Angela Wong", email: "a.wong@coastalseven.com", role: "HR", status: "Active", initials: "AW", color: "bg-primary-container/20 text-on-primary-container" },
  ]);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');

  const handleToggleStatus = (id: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        const newStatus = u.status === 'Active' ? 'Disabled' : 'Active';
        return { ...u, status: newStatus as any };
      }
      return u;
    }));
  };

  const handleDelete = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const handleView = (user: User) => {
    setSelectedUser(user);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? selectedUser : u));
      setIsModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav currentView={view} setView={setView} />
      <main className="flex-grow px-8 max-w-screen-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {view === 'portal' ? (
            <AdminPortal 
              key="portal" 
              onAddHR={() => setView('add-hr')} 
              users={users}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onView={handleView}
            />
          ) : (
            <AddHRView 
              key="add-hr" 
              users={users}
              onToggleStatus={handleToggleStatus}
              onEdit={handleEdit}
            />
          )}
        </AnimatePresence>
      </main>
      <Footer />

      {/* Simple Modal for View/Edit */}
      <AnimatePresence>
        {isModalOpen && selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-surface-container-lowest w-full max-w-md rounded-lg shadow-ambient p-8"
            >
              <h2 className="text-2xl font-bold mb-6">
                {modalMode === 'view' ? 'User Details' : 'Edit User'}
              </h2>
              
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Full Name</label>
                  {modalMode === 'view' ? (
                    <p className="text-on-surface font-medium">{selectedUser.name}</p>
                  ) : (
                    <input 
                      className="w-full px-4 py-2 bg-surface-container-low rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                      value={selectedUser.name}
                      onChange={e => setSelectedUser({...selectedUser, name: e.target.value})}
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Email</label>
                  {modalMode === 'view' ? (
                    <p className="text-on-surface font-medium">{selectedUser.email}</p>
                  ) : (
                    <input 
                      className="w-full px-4 py-2 bg-surface-container-low rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                      value={selectedUser.email}
                      onChange={e => setSelectedUser({...selectedUser, email: e.target.value})}
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Role</label>
                  {modalMode === 'view' ? (
                    <p className="text-on-surface font-medium">{selectedUser.role}</p>
                  ) : (
                    <select 
                      className="w-full px-4 py-2 bg-surface-container-low rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                      value={selectedUser.role}
                      onChange={e => setSelectedUser({...selectedUser, role: e.target.value})}
                    >
                      <option>HR</option>
                      <option>Recruiter</option>
                      <option>Admin</option>
                    </select>
                  )}
                </div>
                
                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:text-primary transition-colors"
                  >
                    Close
                  </button>
                  {modalMode === 'edit' && (
                    <button 
                      type="submit"
                      className="px-6 py-2 bg-primary text-on-primary font-bold rounded-lg text-sm hover:opacity-90 transition-opacity"
                    >
                      Save Changes
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


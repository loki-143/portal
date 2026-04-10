import { cn } from '../lib/utils';
import React from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  Users,
  Settings, 
  Plus, 
  Upload, 
  Bell, 
  HelpCircle,
  LogOut,
  ChevronDown,
  Search
} from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';
import { useAuth } from '../context/auth';

export default function Layout({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const role = user?.role ?? 'recruiter';

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Jobs Management', icon: Briefcase, path: '/jobs' },
    ...(role === 'recruiter'
      ? [{ name: 'Applications', icon: FileText, path: '/applications' }]
      : []),
    ...(role === 'superadmin' || role === 'admin'
      ? [{ name: 'Users Management', icon: Users, path: '/users' }]
      : []),
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar */}
      <aside className="w-72 fixed h-screen bg-surface-container-low/30 hidden lg:flex flex-col z-40">
        <div className="p-8 mb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 soul-gradient rounded-lg flex items-center justify-center text-white">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-xl font-black tracking-tighter text-primary">Coastal Seven</span>
          </div>
          <p className="label-md text-on-surface-variant/50 text-[10px]">
            Unified Portal · {role === 'superadmin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'Recruiter / HR'}
          </p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-6 py-4 rounded-r-full transition-all duration-300 group",
                isActive(item.path) 
                  ? "bg-primary-container/10 text-primary font-bold" 
                  : "text-on-surface-variant hover:bg-surface-container-high hover:translate-x-1"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive(item.path) ? "text-primary" : "text-on-surface-variant/60")} />
              <span className="label-md text-xs">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-8 space-y-4">
          <Button className="w-full" asChild>
            <Link to="/create-job">
              <Plus className="w-4 h-4 mr-2" />
              Post New Job
            </Link>
          </Button>
          {role === 'recruiter' && (
            <Button variant="secondary" className="w-full" asChild>
              <Link to="/bulk-upload">
                <Upload className="w-4 h-4 mr-2" />
                Bulk Upload
              </Link>
            </Button>
          )}
          
          <div className="pt-8 border-t border-outline-variant/30 space-y-1">
            <button className="flex items-center gap-3 px-4 py-2 text-on-surface-variant/60 hover:text-primary transition-colors text-sm font-medium">
              <HelpCircle className="w-4 h-4" />
              Support
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="flex items-center gap-3 px-4 py-2 text-on-surface-variant/60 hover:text-error transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-72 flex flex-col min-h-screen">
        {/* TopNav */}
        <header className="h-20 glass sticky top-0 z-50 flex items-center justify-between px-10">
          <div className="flex items-center gap-8">
            <div className="lg:hidden text-xl font-black tracking-tighter text-primary">Coastal Seven</div>
            <div className="hidden md:flex items-center gap-6">
              <Link
                to="/"
                className="text-on-surface-variant hover:text-primary transition-colors font-medium"
              >
                Dashboard
              </Link>
              <Link
                to="/jobs"
                className="text-on-surface-variant hover:text-primary transition-colors font-medium"
              >
                Jobs
              </Link>
              {role === 'recruiter' ? (
                <Link
                  to="/applications"
                  className="text-on-surface-variant hover:text-primary transition-colors font-medium"
                >
                  Applications
                </Link>
              ) : (
                <Link
                  to="/users"
                  className="text-on-surface-variant hover:text-primary transition-colors font-medium"
                >
                  Users
                </Link>
              )}
              <Link
                to="/settings"
                className="text-on-surface-variant hover:text-primary transition-colors font-medium"
              >
                Settings
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden xl:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
              <input 
                type="text" 
                placeholder="Search candidates..." 
                className="bg-surface-container-low border-none rounded-full pl-12 pr-6 py-2 w-64 focus:ring-2 focus:ring-primary/20 text-sm"
              />
            </div>
            <button className="p-2 text-on-surface-variant/60 hover:bg-surface-container-high rounded-full transition-all">
              <Bell className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-outline-variant/30">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-container">
                <img 
                  src="https://picsum.photos/seed/recruiter/100/100" 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-bold">{user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'User'}</p>
                <p className="text-[10px] label-md text-on-surface-variant/50">
                  {role === 'superadmin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'Recruiter / HR'}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-on-surface-variant/40" />
            </div>
          </div>
        </header>

        <main className="p-10 flex-1">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}

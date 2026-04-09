import { Card } from '../components/ui/Card';
import { Users, Clock, Zap, TrendingUp, Star, AlertCircle, BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';
import { recruiterApplications, recruiterMetrics } from '../data/recruiterSeed';

export default function Dashboard() {
  const shortlistPreview = recruiterApplications
    .filter((application) => application.status === 'Shortlisted')
    .slice(0, 3);

  return (
    <div className="space-y-16">
      <header className="space-y-2">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="display-lg"
        >
          Recruiter Dashboard
        </motion.h1>
        <p className="text-lg font-medium text-secondary opacity-70">
          Overview of the local CSV-backed recruiter workspace
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Primary Metric Card */}
        <Card className="md:col-span-2 relative overflow-hidden group flex flex-col justify-between min-h-[320px]">
          <div className="absolute -right-12 -top-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-primary-container/10 rounded-full text-primary">
                <Users className="w-6 h-6" />
              </div>
              <span className="label-md text-[10px] text-on-surface-variant/60">Pipeline Volume</span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-7xl font-black tracking-tighter">
                {recruiterMetrics.totalApplicants.toLocaleString()}
              </span>
              <span className="text-primary-container font-bold bg-primary-container/10 px-3 py-1 rounded-full text-sm">
                {recruiterMetrics.activeJobs} active roles
              </span>
            </div>
          </div>
          <div className="mt-12 h-2 w-full bg-surface-container-low rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(recruiterMetrics.shortlistRate, 12)}%` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="h-full soul-gradient rounded-full" 
            />
          </div>
        </Card>

        {/* Under Review */}
        <Card variant="low" className="flex flex-col justify-between hover:-translate-y-1 transition-transform">
          <div className="space-y-4">
            <div className="p-3 bg-secondary-container/30 w-fit rounded-full text-secondary">
              <Clock className="w-6 h-6" />
            </div>
            <span className="block text-on-surface-variant font-medium text-sm">Under Review</span>
            <span className="block text-5xl font-black tracking-tighter">
              {recruiterMetrics.pendingApplications}
            </span>
          </div>
          <div className="pt-8 flex justify-between items-center text-xs text-on-surface-variant/40 font-medium">
            <span>{recruiterMetrics.totalApplications} applications seeded locally</span>
            <TrendingUp className="w-4 h-4" />
          </div>
        </Card>

        {/* AI Score Card */}
        <Card className="soul-gradient text-on-primary border-none flex flex-col justify-between group overflow-hidden relative">
          <div className="space-y-4 relative z-10">
            <div className="p-3 bg-white/20 w-fit rounded-full">
              <Zap className="w-6 h-6" />
            </div>
            <span className="block opacity-90 font-medium text-sm">Average AI Score</span>
            <span className="block text-6xl font-black tracking-tighter">
              {recruiterMetrics.averageMatchScore}%
            </span>
          </div>
          <div className="relative z-10 flex items-center gap-2 text-sm opacity-80 pt-8">
            <Star className="w-4 h-4 fill-current" />
            Based on current applications.csv
          </div>
          <BarChart3 className="absolute bottom-0 right-0 opacity-10 translate-y-1/4 translate-x-1/4 w-48 h-48" />
        </Card>

        {/* Shortlisted */}
        <Card variant="low" className="flex flex-col justify-between hover:-translate-y-1 transition-transform">
          <div className="space-y-4">
            <div className="p-3 bg-primary-container/10 w-fit rounded-full text-primary-container">
              <Users className="w-6 h-6" />
            </div>
            <span className="block text-on-surface-variant font-medium text-sm">Shortlisted</span>
            <span className="block text-5xl font-black tracking-tighter">
              {recruiterMetrics.shortlistedApplications}
            </span>
          </div>
          <div className="pt-8 flex -space-x-3">
            {shortlistPreview.map((application) => (
              <img 
                key={application.id}
                src={application.avatar}
                alt={application.name}
                className="w-8 h-8 rounded-full border-2 border-surface-container-low"
                referrerPolicy="no-referrer"
              />
            ))}
            <div className="w-8 h-8 rounded-full border-2 border-surface-container-low bg-surface-container-high flex items-center justify-center text-[10px] font-bold">
              +{Math.max(recruiterMetrics.shortlistedApplications - shortlistPreview.length, 0)}
            </div>
          </div>
        </Card>

        {/* Rejected */}
        <Card variant="low" className="flex flex-col justify-between hover:-translate-y-1 transition-transform">
          <div className="space-y-4">
            <div className="p-3 bg-error-container/30 w-fit rounded-full text-error">
              <AlertCircle className="w-6 h-6" />
            </div>
            <span className="block text-on-surface-variant font-medium text-sm">Rejected</span>
            <span className="block text-5xl font-black tracking-tighter">
              {recruiterMetrics.rejectedApplications}
            </span>
          </div>
          <div className="pt-8">
            <div className="text-xs text-error font-bold flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Review seed filters before moving to DB-backed flows
            </div>
          </div>
        </Card>
      </div>

      <footer className="mt-24 text-center max-w-2xl mx-auto opacity-40">
        <p className="text-lg italic font-medium leading-relaxed">
          "Precision in hiring isn't about finding the most applicants, but the most aligned potential."
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <div className="w-12 h-[1px] bg-on-surface" />
          <span className="text-[10px] label-md">Coastal Seven Intelligence</span>
          <div className="w-12 h-[1px] bg-on-surface" />
        </div>
      </footer>
    </div>
  );
}

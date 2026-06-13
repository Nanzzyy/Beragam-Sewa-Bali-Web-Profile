'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase, type Job, type JobStatus, type AppRole, JOB_STATUS_CONFIG, formatRupiah, formatDate } from '../lib/supabase';
import { fetchJobs, fetchDashboardStats, createJob, updateJob, updateJobStatus, deleteJob, type DashboardStats } from '../lib/jobs';
import JobDetailModal from '../components/JobDetailModal';
import JobFormModal from '../components/JobFormModal';
import GanttScheduler from '../components/GanttScheduler';
import { LayoutDashboard, Briefcase, Plus, Search, Trash2, LogOut, Moon, Sun, CalendarDays, TrendingUp, DollarSign, Users, Filter, Edit, Eye, ChevronRight, Activity, AlertCircle } from 'lucide-react';
import { useTheme } from 'next-themes';

type Tab = 'dashboard' | 'jobs' | 'schedule';

export default function DashboardApp() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<AppRole>('guest');
  const [currentUserId, setCurrentUserId] = useState('');
  const [authReady, setAuthReady] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<JobStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showJobForm, setShowJobForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [viewingJobId, setViewingJobId] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const toggleTheme = () => setTheme(resolvedTheme === 'light' ? 'dark' : 'light');

  // ======== AUTH ========
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setAuthReady(true);
        setUserEmail(session.user.email || '');
        setCurrentUserId(session.user.id);
        try {
          const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
          setUserRole((data?.role as AppRole) || 'guest');
        } catch { setUserRole('guest'); }
      } else {
        setAuthReady(false);
        setCurrentUserId('');
        setUserRole('guest');
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_ev, session) => {
      if (session?.user) {
        setAuthReady(true);
        setUserEmail(session.user.email || '');
        setCurrentUserId(session.user.id);
        try {
          const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
          setUserRole((data?.role as AppRole) || 'guest');
        } catch { setUserRole('guest'); }
      } else {
        setAuthReady(false);
        setUserEmail('');
        setCurrentUserId('');
        setUserRole('guest');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ======== DATA LOADING ========
  const loadData = useCallback(async () => {
    if (!authReady) return;
    setLoading(true);
    try {
      const [jobsData, statsData] = await Promise.all([
        fetchJobs({
          status: statusFilter || undefined,
          search: searchQuery || undefined,
        }),
        fetchDashboardStats(),
      ]);
      setJobs(jobsData);
      setStats(statsData);
    } catch (e) {
      console.error('Failed to load data:', e);
    }
    setLoading(false);
  }, [authReady, statusFilter, searchQuery]);

  useEffect(() => { loadData(); }, [loadData]);

  // ======== HANDLERS ========
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass });
      if (error) throw error;
      setShowLogin(false);
    } catch (err: unknown) {
      setLoginError((err as Error).message || 'Login gagal');
    }
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthReady(false);
    setJobs([]);
    setStats(null);
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm('Yakin ingin menghapus job ini? Data tidak dapat dikembalikan.')) return;
    try {
      await deleteJob(id);
      setJobs(prev => prev.filter(j => j.id !== id));
      loadData();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const handleStatusChange = async (id: string, newStatus: JobStatus) => {
    try {
      await updateJobStatus(id, newStatus);
      loadData();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const canModify = userRole === 'owner' || userRole === 'staff';
  const canViewAll = userRole === 'owner' || userRole === 'accounting';

  // ======== LOGIN SCREEN ========
  if (!loading && (!authReady || showLogin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="glass-card p-8 w-full max-w-md animate-slide-up" style={{ background: '#1e293b', borderColor: '#334155' }}>
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Beragam Sewa Bali</h1>
            <p className="text-slate-400 text-sm mt-1">ERP Dashboard System</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
              <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition" placeholder="email@example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} required
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition" placeholder="••••••••" />
            </div>
            {loginError && <p className="text-red-400 text-xs text-center">{loginError}</p>}
            <button type="submit" disabled={loginLoading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition disabled:opacity-50">
              {loginLoading ? 'Memproses...' : 'Login ke Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ======== SIDEBAR ========
  const SidebarItem = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: Tab }) => (
    <button onClick={() => setTab(value)}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === value ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );

  // ======== MAIN RENDER ========
  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 flex flex-col p-4 shrink-0">
        <div className="flex items-center gap-3 px-2 mb-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">BSB Dashboard</div>
            <div className="text-xs text-slate-500">{userRole.toUpperCase()}</div>
          </div>
        </div>
        <div className="mt-6 space-y-1">
          <SidebarItem icon={LayoutDashboard} label="Overview" value="dashboard" />
          <SidebarItem icon={Briefcase} label="Jobs & Events" value="jobs" />
          <SidebarItem icon={CalendarDays} label="Schedule" value="schedule" />
        </div>
        <div className="mt-auto space-y-2">
          <div className="px-4 py-2 text-xs text-slate-500 truncate">{userEmail}</div>
          {mounted && (
            <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition">
              {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
          )}
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6 lg:p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* === OVERVIEW TAB === */}
            {tab === 'dashboard' && stats && (
              <div className="animate-fade-in space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
                    <p className="text-slate-400 text-sm mt-1">Ringkasan operasional & keuangan</p>
                  </div>
                  {canModify && (
                    <button onClick={() => { setEditingJob(null); setShowJobForm(true); }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition text-sm">
                      <Plus className="w-4 h-4" /> Job Baru
                    </button>
                  )}
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard icon={Briefcase} label="Total Jobs" value={stats.totalJobs.toString()} color="#3B82F6" />
                  <StatCard icon={Activity} label="Jobs Aktif" value={stats.activeJobs.toString()} color="#F59E0B" />
                  {canViewAll && <StatCard icon={TrendingUp} label="Pendapatan" value={formatRupiah(stats.totalRevenue)} color="#10B981" />}
                  {canViewAll && <StatCard icon={DollarSign} label="Laba Bersih" value={formatRupiah(stats.netProfit)} color="#8B5CF6" />}
                </div>

                {/* Status Distribution */}
                <div className="glass-card p-6" style={{ background: '#1e293b', borderColor: '#334155' }}>
                  <h3 className="text-white font-semibold mb-4">Distribusi Status Job</h3>
                  <div className="grid grid-cols-5 gap-3">
                    {(Object.keys(JOB_STATUS_CONFIG) as JobStatus[]).map(status => (
                      <div key={status} className="text-center p-3 rounded-xl" style={{ background: JOB_STATUS_CONFIG[status].bg }}>
                        <div className="text-2xl font-bold" style={{ color: JOB_STATUS_CONFIG[status].color }}>{stats.jobsByStatus[status]}</div>
                        <div className="text-xs text-slate-400 mt-1">{JOB_STATUS_CONFIG[status].label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Jobs */}
                <div className="glass-card p-6" style={{ background: '#1e293b', borderColor: '#334155' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold">Job Terbaru</h3>
                    <button onClick={() => setTab('jobs')} className="text-emerald-400 text-sm hover:text-emerald-300 flex items-center gap-1">
                      Lihat Semua <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {jobs.slice(0, 5).map(job => (
                      <div key={job.id} onClick={() => setViewingJobId(job.id)}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/50 transition cursor-pointer group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: JOB_STATUS_CONFIG[job.status].color }} />
                          <div className="min-w-0">
                            <div className="text-sm text-white font-medium truncate">{job.client_name}</div>
                            <div className="text-xs text-slate-500 truncate">{job.venue} • {formatDate(job.job_date)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="status-badge" style={{ color: JOB_STATUS_CONFIG[job.status].color, background: JOB_STATUS_CONFIG[job.status].bg }}>
                            {JOB_STATUS_CONFIG[job.status].label}
                          </span>
                          <Eye className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition" />
                        </div>
                      </div>
                    ))}
                    {jobs.length === 0 && <p className="text-center text-slate-500 py-6 text-sm">Belum ada data job.</p>}
                  </div>
                </div>
              </div>
            )}

            {/* === JOBS LIST TAB === */}
            {tab === 'jobs' && (
              <div className="animate-fade-in space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-white">Manajemen Job & Event</h1>
                    <p className="text-slate-400 text-sm mt-1">Kelola penyewaan peralatan event</p>
                  </div>
                  {canModify && (
                    <button onClick={() => { setEditingJob(null); setShowJobForm(true); }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition text-sm">
                      <Plus className="w-4 h-4" /> Job Baru
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari client, venue..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition text-sm" />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as JobStatus | '')}
                      className="pl-10 pr-8 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-emerald-500 transition text-sm appearance-none cursor-pointer">
                      <option value="">Semua Status</option>
                      {(Object.keys(JOB_STATUS_CONFIG) as JobStatus[]).map(s => (
                        <option key={s} value={s}>{JOB_STATUS_CONFIG[s].label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Job Cards */}
                <div className="space-y-3">
                  {jobs.map(job => (
                    <div key={job.id} className="glass-card p-4 flex items-center justify-between hover:border-slate-600 transition group" style={{ background: '#1e293b', borderColor: '#334155' }}>
                      <div className="flex items-center gap-4 min-w-0 flex-1 cursor-pointer" onClick={() => setViewingJobId(job.id)}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: JOB_STATUS_CONFIG[job.status].bg }}>
                          <Briefcase className="w-5 h-5" style={{ color: JOB_STATUS_CONFIG[job.status].color }} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-white font-semibold truncate">{job.client_name}</div>
                          <div className="text-xs text-slate-400 truncate">{job.venue} • {formatDate(job.job_date)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        {canViewAll && <span className="text-emerald-400 font-semibold text-sm hidden lg:block">{formatRupiah(job.total_rental_fee)}</span>}
                        <select value={job.status} onChange={e => handleStatusChange(job.id, e.target.value as JobStatus)}
                          disabled={!canModify}
                          className="px-3 py-1.5 text-xs font-semibold rounded-full border-0 outline-none cursor-pointer"
                          style={{ color: JOB_STATUS_CONFIG[job.status].color, background: JOB_STATUS_CONFIG[job.status].bg }}>
                          {(Object.keys(JOB_STATUS_CONFIG) as JobStatus[]).map(s => (
                            <option key={s} value={s}>{JOB_STATUS_CONFIG[s].label}</option>
                          ))}
                        </select>
                        <button onClick={() => setViewingJobId(job.id)} className="p-2 hover:bg-slate-700 rounded-lg transition" title="Lihat Detail">
                          <Eye className="w-4 h-4 text-slate-400 hover:text-emerald-400" />
                        </button>
                        {canModify && (
                          <>
                            <button onClick={() => { setEditingJob(job); setShowJobForm(true); }} className="p-2 hover:bg-slate-700 rounded-lg transition" title="Edit">
                              <Edit className="w-4 h-4 text-slate-400 hover:text-blue-400" />
                            </button>
                            {userRole === 'owner' && (
                              <button onClick={() => handleDeleteJob(job.id)} className="p-2 hover:bg-red-500/10 rounded-lg transition" title="Hapus">
                                <Trash2 className="w-4 h-4 text-slate-500 hover:text-red-400" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {jobs.length === 0 && (
                    <div className="text-center py-16">
                      <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">Tidak ada job ditemukan.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === SCHEDULE TAB === */}
            {tab === 'schedule' && (
              <div className="animate-fade-in space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-white">Schedule Timeline</h1>
                  <p className="text-slate-400 text-sm mt-1">Visualisasi jadwal setup, event, dan bongkar</p>
                </div>
                <GanttScheduler jobs={jobs} onJobClick={(id) => setViewingJobId(id)} />
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {showJobForm && (
        <JobFormModal
          job={editingJob}
          onClose={() => { setShowJobForm(false); setEditingJob(null); }}
          onSaved={() => { setShowJobForm(false); setEditingJob(null); loadData(); }}
        />
      )}
      {viewingJobId && (
        <JobDetailModal
          jobId={viewingJobId}
          userRole={userRole}
          currentUserId={currentUserId}
          onClose={() => setViewingJobId(null)}
          onStatusChange={(id, status) => { handleStatusChange(id, status); }}
        />
      )}
    </div>
  );
}

// ======== STAT CARD COMPONENT ========
function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="glass-card p-5 flex items-center gap-4" style={{ background: '#1e293b', borderColor: '#334155' }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div>
        <div className="text-xs text-slate-400 font-medium">{label}</div>
        <div className="text-xl font-bold text-white mt-0.5">{value}</div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase, type Job, type JobStatus, type AppRole, JOB_STATUS_CONFIG, formatRupiah, formatDate } from '../lib/supabase';
import { fetchJobs, fetchDashboardStats, createJob, updateJob, updateJobStatus, deleteJob, type DashboardStats } from '../lib/jobs';
import JobDetailModal from '../components/JobDetailModal';
import JobFormModal from '../components/JobFormModal';
import GanttScheduler from '../components/GanttScheduler';
import { LayoutDashboard, Briefcase, Plus, Search, Trash2, LogOut, Moon, Sun, CalendarDays, TrendingUp, DollarSign, Users, Filter, Edit, Eye, ChevronRight, Activity, AlertCircle, Package, X } from 'lucide-react';
import { useTheme } from 'next-themes';

type Tab = 'dashboard' | 'jobs' | 'schedule' | 'inventory' | 'staff';

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

  // Inventories & Staff Lists
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);

  // Item Modal State
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemModalData, setItemModalData] = useState<{ id?: string; name: string; category_id: string } | null>(null);

  // Staff Modal State
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffModalData, setStaffModalData] = useState<{ id?: string; email: string; display_name: string; role: string } | null>(null);

  // Confirm Modal State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

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

      // Fetch items and staff simply for display
      const { data: iData } = await supabase.from('items').select('*').order('name');
      if (iData) setItemsList(iData);
      const { data: sData } = await supabase.from('profiles').select('*').order('email');
      if (sData) setStaffList(sData);

    } catch (e) {
      console.error('Failed to load data:', e);
    }
    setLoading(false);
  }, [authReady, statusFilter, searchQuery]);

  useEffect(() => { 
    loadData(); 
    // Real-time polling every 15 seconds
    const interval = setInterval(() => { loadData(); }, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

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
    setShowLogin(false);
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

  // ======== LANDING ATAU LOGIN SCREEN ========
  if (!loading && !authReady) {
    if (!showLogin) {
      return <LandingPage onLoginClick={() => setShowLogin(true)} />;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-700/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl border p-8 w-full max-w-md animate-slide-up relative z-10" >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-purple-600/10 flex items-center justify-center mx-auto mb-4 border border-purple-600/20 shadow-lg shadow-purple-600/10">
              <Briefcase className="w-8 h-8 text-purple-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Beragam Sewa Bali</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">ERP Dashboard System</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Email</label>
              <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-none transition" placeholder="email@example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Password</label>
              <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} required
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-none transition" placeholder="••••••••" />
            </div>
            {loginError && <p className="text-red-400 text-xs text-center bg-red-500/10 py-2 rounded">{loginError}</p>}
            <button type="submit" disabled={loginLoading}
              className="w-full py-2.5 mt-2 bg-purple-700 hover:bg-purple-600 text-slate-900 dark:text-white font-semibold rounded-lg transition disabled:opacity-50 shadow-lg shadow-emerald-900/20">
              {loginLoading ? 'Memproses...' : 'Login ke Dashboard'}
            </button>
            <button type="button" onClick={() => setShowLogin(false)} className="w-full mt-4 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition">
              &larr; Kembali ke Beranda
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ======== SIDEBAR ========
  const SidebarItem = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: Tab }) => (
    <button onClick={() => setTab(value)}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === value ? 'bg-purple-600/10 text-purple-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-white dark:bg-slate-800'}`}>
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );

  // ======== MAIN RENDER ========
  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 flex flex-col p-4 shrink-0">
        <div className="flex items-center gap-3 px-2 mb-2">
          <div className="w-9 h-9 rounded-xl bg-purple-600/10 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">BSB Dashboard</div>
            <div className="text-xs text-slate-500">{userRole.toUpperCase()}</div>
          </div>
        </div>
        <div className="mt-6 space-y-1">
          <SidebarItem icon={LayoutDashboard} label="Overview" value="dashboard" />
          <SidebarItem icon={Briefcase} label="Jobs & Events" value="jobs" />
          <SidebarItem icon={CalendarDays} label="Schedule" value="schedule" />
          <div className="pt-4 pb-2 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Master Data</div>
          <SidebarItem icon={Package} label="Menu Barang" value="inventory" />
          <SidebarItem icon={Users} label="Daftar Karyawan" value="staff" />
        </div>
        <div className="mt-auto space-y-2">
          <div className="px-4 py-2 text-xs text-slate-500 truncate">{userEmail}</div>
          {mounted && (
            <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-white dark:bg-slate-800 transition">
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
            <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* === OVERVIEW TAB === */}
            {tab === 'dashboard' && stats && (
              <div className="animate-fade-in space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard Overview</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Ringkasan operasional & keuangan</p>
                  </div>
                  {canModify && (
                    <button onClick={() => { setEditingJob(null); setShowJobForm(true); }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-purple-700 hover:bg-purple-600 text-slate-900 dark:text-white font-semibold rounded-xl transition text-sm">
                      <Plus className="w-4 h-4" /> Job Baru
                    </button>
                  )}
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <StatCard icon={Briefcase} label="Total Jobs" value={stats.totalJobs.toString()} color="#3B82F6" />
                  <StatCard icon={Activity} label="Jobs Aktif" value={stats.activeJobs.toString()} color="#F59E0B" />
                  {canViewAll && <StatCard icon={TrendingUp} label="Pendapatan (Jobs)" value={formatRupiah(stats.totalRevenue)} color="#10B981" />}
                  {canViewAll && <StatCard icon={DollarSign} label="Laba Bersih (Jobs)" value={formatRupiah(stats.netProfit)} color="#8B5CF6" />}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <StatCard icon={Package} label="Total Inventory" value={stats.totalInventory.toString()} color="#ec4899" />
                  <StatCard icon={LayoutDashboard} label="LP Services" value={stats.landingPageServices.toString()} color="#06b6d4" />
                  <StatCard icon={LayoutDashboard} label="LP Packages" value={stats.landingPagePackages.toString()} color="#f43f5e" />
                  {canViewAll && <StatCard icon={TrendingUp} label="Cashflow In" value={formatRupiah(stats.cashflowIn)} color="#14b8a6" />}
                  {canViewAll && <StatCard icon={DollarSign} label="Cashflow Out" value={formatRupiah(stats.cashflowOut)} color="#ef4444" />}
                </div>

                {/* Status Distribution */}
                <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl border p-6" >
                  <h3 className="text-slate-900 dark:text-white font-semibold mb-4">Distribusi Status Job</h3>
                  <div className="grid grid-cols-5 gap-3">
                    {(Object.keys(JOB_STATUS_CONFIG) as JobStatus[]).map(status => (
                      <div key={status} className="text-center p-3 rounded-xl" style={{ background: JOB_STATUS_CONFIG[status].bg }}>
                        <div className="text-2xl font-bold" style={{ color: JOB_STATUS_CONFIG[status].color }}>{stats.jobsByStatus[status]}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{JOB_STATUS_CONFIG[status].label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Jobs */}
                <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl border p-6" >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-slate-900 dark:text-white font-semibold">Job Terbaru</h3>
                    <button onClick={() => setTab('jobs')} className="text-purple-500 text-sm hover:text-emerald-300 flex items-center gap-1">
                      Lihat Semua <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {jobs.slice(0, 5).map(job => (
                      <div key={job.id} onClick={() => setViewingJobId(job.id)}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-white dark:bg-slate-50 dark:bg-slate-800/50 transition cursor-pointer group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: JOB_STATUS_CONFIG[job.status].color }} />
                          <div className="min-w-0">
                            <div className="text-sm text-slate-900 dark:text-white font-medium truncate">{job.client_name}</div>
                            <div className="text-xs text-slate-500 truncate">{job.venue} • {formatDate(job.job_date)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="status-badge" style={{ color: JOB_STATUS_CONFIG[job.status].color, background: JOB_STATUS_CONFIG[job.status].bg }}>
                            {JOB_STATUS_CONFIG[job.status].label}
                          </span>
                          <Eye className="w-4 h-4 text-slate-600 group-hover:text-purple-500 transition" />
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
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manajemen Job & Event</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Kelola penyewaan peralatan event</p>
                  </div>
                  {canModify && (
                    <button onClick={() => { setEditingJob(null); setShowJobForm(true); }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-purple-700 hover:bg-purple-600 text-slate-900 dark:text-white font-semibold rounded-xl transition text-sm">
                      <Plus className="w-4 h-4" /> Job Baru
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari client, venue..."
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 outline-none focus:border-purple-600 transition text-sm" />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as JobStatus | '')}
                      className="pl-10 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-purple-600 transition text-sm appearance-none cursor-pointer">
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
                    <div key={job.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl border p-4 flex items-center justify-between hover:border-slate-600 transition group" >
                      <div className="flex items-center gap-4 min-w-0 flex-1 cursor-pointer" onClick={() => setViewingJobId(job.id)}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: JOB_STATUS_CONFIG[job.status].bg }}>
                          <Briefcase className="w-5 h-5" style={{ color: JOB_STATUS_CONFIG[job.status].color }} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-slate-900 dark:text-white font-semibold truncate">{job.client_name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{job.venue} • {formatDate(job.job_date)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        {canViewAll && <span className="text-purple-500 font-semibold text-sm hidden lg:block">{formatRupiah(job.total_rental_fee)}</span>}
                        <select value={job.status} onChange={e => handleStatusChange(job.id, e.target.value as JobStatus)}
                          disabled={!canModify}
                          className="px-3 py-1.5 text-xs font-semibold rounded-full border-0 outline-none cursor-pointer"
                          style={{ color: JOB_STATUS_CONFIG[job.status].color, background: JOB_STATUS_CONFIG[job.status].bg }}>
                          {(Object.keys(JOB_STATUS_CONFIG) as JobStatus[]).map(s => (
                            <option key={s} value={s}>{JOB_STATUS_CONFIG[s].label}</option>
                          ))}
                        </select>
                        <button onClick={() => setViewingJobId(job.id)} className="p-2 hover:bg-slate-700 rounded-lg transition" title="Lihat Detail">
                          <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400 hover:text-purple-500" />
                        </button>
                        {canModify && (
                          <>
                            <button onClick={() => { setEditingJob(job); setShowJobForm(true); }} className="p-2 hover:bg-slate-700 rounded-lg transition" title="Edit">
                              <Edit className="w-4 h-4 text-slate-500 dark:text-slate-400 hover:text-blue-400" />
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
                      <p className="text-slate-500 dark:text-slate-400">Tidak ada job ditemukan.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === SCHEDULE TAB === */}
            {tab === 'schedule' && (
              <div className="animate-fade-in space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Schedule Timeline</h1>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Visualisasi jadwal setup, event, dan bongkar</p>
                </div>
                <GanttScheduler jobs={jobs} onJobClick={(id) => setViewingJobId(id)} />
              </div>
            )}

            {/* === INVENTORY TAB === */}
            {tab === 'inventory' && (
              <div className="animate-fade-in space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Menu Barang</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Daftar inventaris alat dan barang</p>
                  </div>
                  {canModify && (
                    <button onClick={() => {
                      setItemModalData({ name: '', category_id: '' });
                      setItemModalOpen(true);
                    }} className="flex items-center gap-2 px-4 py-2.5 bg-purple-700 hover:bg-purple-600 text-white font-semibold rounded-xl transition text-sm shadow-md shadow-purple-500/20">
                      <Plus className="w-4 h-4" /> Tambah Barang
                    </button>
                  )}
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-4">
                  {itemsList.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-500 dark:text-slate-400">Belum ada barang di database.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {itemsList.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition group">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                              <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">{item.name}</div>
                              <div className="text-xs text-slate-500">Kategori: {item.category_id || '-'}</div>
                            </div>
                          </div>
                          {canModify && (
                            <div className="flex items-center gap-2">
                              <button onClick={() => {
                                setItemModalData({ id: item.id, name: item.name, category_id: item.category_id || '' });
                                setItemModalOpen(true);
                              }} className="p-2 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => {
                                setConfirmModalConfig({
                                  title: 'Hapus Barang',
                                  message: `Apakah Anda yakin ingin menghapus barang "${item.name}" dari inventaris?`,
                                  onConfirm: () => {
                                    supabase.from('items').delete().eq('id', item.id).then(() => {
                                      loadData();
                                      setConfirmModalOpen(false);
                                    });
                                  }
                                });
                                setConfirmModalOpen(true);
                              }} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === STAFF TAB === */}
            {tab === 'staff' && (
              <div className="animate-fade-in space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Daftar Karyawan</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Kelola data profil karyawan</p>
                  </div>
                  {userRole === 'owner' && (
                    <button onClick={() => {
                      setStaffModalData({ email: '', display_name: '', role: 'staff' });
                      setStaffModalOpen(true);
                    }} className="flex items-center gap-2 px-4 py-2.5 bg-purple-700 hover:bg-purple-600 text-white font-semibold rounded-xl transition text-sm shadow-md shadow-purple-500/20">
                      <Plus className="w-4 h-4" /> Tambah Karyawan
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staffList.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
                      <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-500 dark:text-slate-400">Belum ada data karyawan.</p>
                    </div>
                  ) : (
                    staffList.map(staff => (
                      <div key={staff.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-5 relative group">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-lg">
                            {(staff.display_name || staff.email || '?')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-white truncate">{staff.display_name || 'Tanpa Nama'}</div>
                            <div className="text-xs text-slate-500 truncate">{staff.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-medium px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                            {staff.role}
                          </div>
                          {userRole === 'owner' && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                              <button onClick={() => {
                                setStaffModalData({ id: staff.id, email: staff.email || '', display_name: staff.display_name || '', role: staff.role || 'staff' });
                                setStaffModalOpen(true);
                              }} className="p-1.5 text-slate-400 hover:text-blue-500 bg-slate-50 dark:bg-slate-800 rounded-md">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => {
                                setConfirmModalConfig({
                                  title: 'Hapus Karyawan',
                                  message: `Apakah Anda yakin ingin menghapus karyawan "${staff.display_name || staff.email}"? Ini hanya akan menghapus profil mereka dari database.`,
                                  onConfirm: () => {
                                    supabase.from('profiles').delete().eq('id', staff.id).then(() => {
                                      loadData();
                                      setConfirmModalOpen(false);
                                    });
                                  }
                                });
                                setConfirmModalOpen(true);
                              }} className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-slate-800 rounded-md">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
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

      {/* Item Add/Edit Modal */}
      {itemModalOpen && itemModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-[2rem] p-8 w-full max-w-lg relative animate-slide-up">
            <button onClick={() => setItemModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center shadow-inner">
                <Package className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {itemModalData.id ? 'Edit Barang' : 'Tambah Barang Baru'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Lengkapi informasi inventaris di bawah ini.</p>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const target = e.target as typeof e.target & {
                name: { value: string };
                category_id: { value: string };
              };
              const payload = {
                name: target.name.value.trim(),
                category_id: target.category_id.value.trim() || null
              };
              try {
                if (itemModalData.id) {
                  await supabase.from('items').update(payload).eq('id', itemModalData.id);
                } else {
                  await supabase.from('items').insert(payload);
                }
                loadData();
                setItemModalOpen(false);
              } catch (err) {
                alert((err as Error).message);
              }
            }} className="space-y-6">
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nama Barang <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Package className="h-5 w-5 text-slate-400" />
                  </div>
                  <input type="text" name="name" defaultValue={itemModalData.name} required placeholder="Contoh: Sound System 1000W" 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all text-sm font-medium" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Kategori (Opsional)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Filter className="h-5 w-5 text-slate-400" />
                  </div>
                  <input type="text" name="category_id" defaultValue={itemModalData.category_id} placeholder="Contoh: Audio, Lighting, General" 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all text-sm font-medium" />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-6 border-t border-slate-100 dark:border-slate-800 mt-2">
                <button type="button" onClick={() => setItemModalOpen(false)} className="px-6 py-2.5 text-sm font-bold rounded-xl text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  Batal
                </button>
                <button type="submit" className="px-8 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Add/Edit Modal */}
      {staffModalOpen && staffModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-[2rem] p-8 w-full max-w-lg relative animate-slide-up">
            <button onClick={() => setStaffModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shadow-inner">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {staffModalData.id ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Atur hak akses dan email staf.</p>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const target = e.target as typeof e.target & {
                email: { value: string };
                role: { value: string };
              };
              const payload = {
                email: target.email.value.trim(),
                role: target.role.value
              };
              try {
                if (staffModalData.id) {
                  await supabase.from('profiles').update(payload).eq('id', staffModalData.id);
                } else {
                  await supabase.from('profiles').insert(payload);
                }
                loadData();
                setStaffModalOpen(false);
              } catch (err) {
                alert((err as Error).message);
              }
            }} className="space-y-6">
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Alamat Email <span className="text-red-500">*</span></label>
                <input type="email" name="email" defaultValue={staffModalData.email} required placeholder="budi@example.com" disabled={!!staffModalData.id} 
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Role Hak Akses</label>
                <select name="role" defaultValue={staffModalData.role} 
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all text-sm font-medium appearance-none cursor-pointer">
                  <option value="staff">Staff (Lapangan & Logistik)</option>
                  <option value="accounting">Accounting (Keuangan)</option>
                  <option value="owner">Owner (Pemilik Toko)</option>
                  <option value="guest">Guest (Tamu)</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-6 border-t border-slate-100 dark:border-slate-800 mt-2">
                <button type="button" onClick={() => setStaffModalOpen(false)} className="px-6 py-2.5 text-sm font-bold rounded-xl text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  Batal
                </button>
                <button type="submit" className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Simpan Akses
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmModalOpen && confirmModalConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl p-6 w-full max-w-sm relative animate-slide-up">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{confirmModalConfig.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">{confirmModalConfig.message}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmModalOpen(false)} className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                Batal
              </button>
              <button onClick={confirmModalConfig.onConfirm} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-red-500/10">
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ======== STAT CARD COMPONENT ========
function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl border p-5 flex items-center gap-4" >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</div>
        <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{value}</div>
      </div>
    </div>
  );
}

// ======== LANDING PAGE COMPONENT ========
function LandingPage({ onLoginClick }: { onLoginClick: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white selection:bg-purple-600/30 overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-700/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/10 flex items-center justify-center border border-purple-600/20 shadow-lg shadow-purple-600/10">
            <Briefcase className="w-5 h-5 text-purple-500" />
          </div>
          <span className="font-bold text-xl tracking-tight">Beragam Sewa</span>
        </div>
        <button onClick={onLoginClick} className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 transition">
          Login Staff
        </button>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-24 pb-32 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-600/10 border border-purple-600/20 text-purple-500 text-xs font-semibold mb-8 animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600"></span>
          </span>
          Sistem ERP Terintegrasi 2026
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
          Manajemen Rental <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500">
            Lebih Cerdas & Akurat
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mb-12 animate-slide-up" style={{ animationDelay: '200ms' }}>
          Platform satu atap untuk mengelola jadwal event, persediaan alat, penjadwalan kru, dan akuntansi double-entry secara otomatis.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: '300ms' }}>
          <button onClick={onLoginClick} className="px-8 py-4 rounded-xl bg-purple-700 hover:bg-purple-600 text-slate-900 dark:text-white font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-900/20">
            Masuk ke Dashboard <ChevronRight className="w-5 h-5" />
          </button>
          <a href="https://beragamsewabali.com" target="_blank" rel="noreferrer" className="px-8 py-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-700 text-slate-900 dark:text-white font-semibold flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition">
            Kunjungi Website Utama
          </a>
        </div>
      </main>

      {/* Feature Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '400ms' }}>
        <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl border p-8 bg-slate-900/50 border-slate-200 dark:border-slate-800 backdrop-blur-sm hover:border-purple-600/50 transition duration-300">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/10 flex items-center justify-center mb-6 border border-purple-600/20">
            <CalendarDays className="w-6 h-6 text-purple-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Penjadwalan Interaktif</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Visualisasi timeline event dan setup dengan Gantt chart cerdas. Hindari bentrok jadwal penyewaan secara efektif.</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl border p-8 bg-slate-900/50 border-slate-200 dark:border-slate-800 backdrop-blur-sm hover:border-blue-500/50 transition duration-300">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20">
            <Activity className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Akuntansi Otomatis</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Setiap penyewaan yang selesai akan terintegrasi langsung ke sistem jurnal double-entry Cashflow Beragam Sewa Bali.</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl border p-8 bg-slate-900/50 border-slate-200 dark:border-slate-800 backdrop-blur-sm hover:border-amber-500/50 transition duration-300">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6 border border-amber-500/20">
            <Users className="w-6 h-6 text-amber-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Kolaborasi Kru</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Bagikan akses secara terstruktur (Owner, Accounting, Staff). Semua tindakan akan terekam dalam audit log.</p>
        </div>
      </section>
    </div>
  );
}

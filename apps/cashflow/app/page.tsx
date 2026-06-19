'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Account, TrialBalanceRow, Transaction, JournalEntryWithAccount, JournalEntryInput } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { fetchAccounts, fetchTrialBalance, fetchTransactionsWithEntries, createTransaction, deleteTransaction, updateTransaction } from '../lib/accounting';
import ExcelExportButton from '../components/ExcelExportButton';
import TransactionModal from '../components/TransactionModal';
import Worksheet from '../components/Worksheet';
import ChartOfAccountsGrid from '../components/ChartOfAccountsGrid';
import FixedAssetsGrid from '../components/FixedAssetsGrid';
import LedgerByAccount from '../components/LedgerByAccount';
import DashboardChart from '../components/DashboardChart';
import { LayoutDashboard, BookOpen, BookText, ClipboardList, Settings, FileSpreadsheet, FolderOpen, Building2, LogOut, ArrowRight, ShieldCheck, BarChart3, Wallet, Trash2, Plus, Moon, Sun, DownloadCloud, Pencil } from 'lucide-react';
import { useTheme } from 'next-themes';

type Tab = 'dashboard' | 'ledger' | 'ledger-acc' | 'neraca' | 'adjusting' | 'worksheet' | 'accounts' | 'assets';

type TxWithEntries = Transaction & { journal_entries: JournalEntryWithAccount[] };

export default function CashflowDashboard() {
  const [tab, setTabState] = useState<Tab>('dashboard');

  const setTab = (newTab: Tab) => {
    setTabState(newTab);
    if (typeof window !== 'undefined') localStorage.setItem('bsb_cashflow_tab', newTab);
  };
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceRow[]>([]);
  const [transactions, setTransactions] = useState<TxWithEntries[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TxWithEntries | null>(null);
  const [userRole, setUserRole] = useState<string>('guest');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [authReady, setAuthReady] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('bsb_cashflow_tab') as Tab;
      if (savedTab) setTabState(savedTab);

      // Fetch dynamic favicon
      supabase.from('site_content').select('content_value').eq('content_key', 'site_logo').single().then(({ data }) => {
        if (data?.content_value) {
          let favicon = (document.getElementById('favicon') as HTMLLinkElement) || (document.querySelector("link[rel~='icon']") as HTMLLinkElement);
          if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            favicon.id = 'favicon';
            document.head.appendChild(favicon);
          }
          favicon.href = data.content_value + '?t=' + new Date().getTime();
        }
      });
    }

    // PWA setup
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
  };

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
    }
  };

  // Check auth
  useEffect(() => {
    let mounted = true;
    let initialCheckDone = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setAuthReady(true);
        setUserEmail(session.user.email || '');
        setCurrentUserId(session.user.id);
        
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          if (mounted && data && !error) {
            setUserRole(data.role);
          } else if (mounted) {
            setUserRole('guest');
          }
        } catch (e) {
          if (mounted) setUserRole('guest');
        }
      } else {
        setAuthReady(false);
        setUserEmail('');
        setCurrentUserId('');
        setUserRole('guest');
      }
      if (!initialCheckDone && mounted) {
        initialCheckDone = true;
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted || initialCheckDone) return;
      if (session?.user) {
        setAuthReady(true);
        setUserEmail(session.user.email || '');
        setCurrentUserId(session.user.id);
        try {
          const { data, error } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
          if (mounted && data && !error) {
            setUserRole(data.role);
          } else if (mounted) {
            setUserRole('guest');
          }
        } catch {
          if (mounted) setUserRole('guest');
        }
      }
      if (!initialCheckDone && mounted) {
        initialCheckDone = true;
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadData = useCallback(async () => {
    if (!authReady || !currentUserId) return;
    setLoading(true);
    try {
      let activeRole = userRole;
      if (!activeRole) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUserId)
          .single();
        activeRole = data?.role || 'guest';
      }

      const [accs, tb, txs] = await Promise.all([
        fetchAccounts(),
        fetchTrialBalance(),
        fetchTransactionsWithEntries({ limit: 100 }),
      ]);
      setAccounts(accs);

      if (activeRole === 'guest') {
        const filteredTxs = txs.filter(tx => tx.created_by === currentUserId);
        setTransactions(filteredTxs);

        const localTB = accs.map(acc => {
          let totalDebit = 0;
          let totalCredit = 0;
          
          filteredTxs.forEach(tx => {
            tx.journal_entries.forEach(je => {
              if (je.account_code === acc.account_code) {
                totalDebit += je.debit;
                totalCredit += je.credit;
              }
            });
          });
          
          const endingBalance = ['Asset', 'Expense'].includes(acc.category)
            ? totalDebit - totalCredit
            : totalCredit - totalDebit;
            
          return {
            account_code: acc.account_code,
            account_name: acc.account_name,
            category: acc.category,
            normal_balance: acc.normal_balance,
            total_debit: totalDebit,
            total_credit: totalCredit,
            ending_balance: endingBalance
          };
        });
        setTrialBalance(localTB);
      } else {
        setTransactions(txs);
        setTrialBalance(tb);
      }
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [authReady, currentUserId, userRole]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (userRole === 'guest' && !['dashboard', 'ledger', 'ledger-acc', 'accounts'].includes(tab)) {
      setTab('dashboard');
    }
  }, [userRole, tab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass });
    if (error) setLoginError(error.message);
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthReady(false);
    setShowLogin(false);
  };

  const handleCreateTx = async (data: { description: string; date: string; is_adjusting?: boolean; entries: JournalEntryInput[] }) => {
    await createTransaction({ ...data }, accounts);
    await loadData();
  };

  const handleUpdateTx = async (data: { description: string; date: string; is_adjusting?: boolean; entries: JournalEntryInput[] }) => {
    if (!editingTransaction) return;
    await updateTransaction(editingTransaction.id, { ...data }, accounts);
    setEditingTransaction(null);
    await loadData();
  };

  const handleDeleteTx = async (id: string) => {
    if (!confirm('Hapus transaksi ini beserta seluruh jurnal entri?')) return;
    await deleteTransaction(id);
    await loadData();
  };

  const totalAssets = trialBalance.filter(r => r.category === 'Asset').reduce((s, r) => s + r.ending_balance, 0);
  const totalLiabilities = trialBalance.filter(r => r.category === 'Liability').reduce((s, r) => s + r.ending_balance, 0);
  const totalRevenue = trialBalance.filter(r => r.category === 'Revenue').reduce((s, r) => s + r.ending_balance, 0);
  const totalExpense = trialBalance.filter(r => r.category === 'Expense').reduce((s, r) => s + r.ending_balance, 0);
  const netIncome = totalRevenue - totalExpense;
  const tbDebit = trialBalance.reduce((s, r) => s + r.total_debit, 0);
  const tbCredit = trialBalance.reduce((s, r) => s + r.total_credit, 0);

  const fmtRp = (n: number) => `Rp. ${n.toLocaleString('id-ID')}`;

  // Landing Page & Login
  if (!authReady && !loading) {
    if (!showLogin) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-800 dark:text-slate-200 font-sans selection:bg-emerald-500/20 dark:selection:bg-emerald-500/30  transition-colors duration-300">
          <header className="px-6 py-4 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/60 transition-colors duration-300">
            <div className="flex items-center gap-2">
              <img src="/logo-bsb.png" alt="BSB Logo" className="w-8 h-8 rounded-lg shadow-sm" />
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">BSB Cashflow</span>
            </div>
            <div className="flex items-center gap-4">
              {mounted && (
                <button onClick={toggleTheme} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                  {resolvedTheme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </button>
              )}
              <button onClick={() => setShowLogin(true)} className="px-5 py-2.5 text-sm font-semibold bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 rounded-lg transition-colors shadow-sm flex items-center gap-2">
                Masuk <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </header>
          
          <main className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 text-xs font-semibold mb-8 border border-emerald-100">
              <ShieldCheck className="w-4 h-4" /> Sistem Akuntansi Aman & Terintegrasi
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
              Kelola Keuangan dengan <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Double-Entry</span> Cerdas
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 mb-10 max-w-2xl leading-relaxed mx-auto">
              Platform pembukuan modern khusus PT Praven Bali Production. Pantau arus kas, catat aktiva tetap, dan buat neraca lajur dengan standar akuntansi profesional.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
              <button onClick={() => setShowLogin(true)} className="px-8 py-4 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2">
                Akses Dashboard
              </button>
              {deferredPrompt && (
                <button onClick={handleInstallClick} className="px-8 py-4 text-base font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl transition-all shadow-sm flex items-center justify-center gap-2">
                  <DownloadCloud className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Install App
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left w-full">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4"><Wallet className="w-5 h-5" /></div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">Buku Besar Akurat</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Pencatatan mutasi transaksi dengan sistem double-entry yang menjamin neraca selalu seimbang secara otomatis.</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm">
                <div className="w-10 h-10 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center mb-4"><BarChart3 className="w-5 h-5" /></div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">Laporan Real-Time</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Dapatkan visualisasi ringkasan laba rugi, aset, dan ekuitas terbaru setiap saat tanpa perlu rekapitulasi manual.</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm">
                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center mb-4"><FileSpreadsheet className="w-5 h-5" /></div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">Ekspor Instan</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Satu klik untuk mengunduh seluruh data dalam format Excel yang rapi, profesional, dan siap dilampirkan.</p>
              </div>
            </div>
          </main>
          
          <footer className="py-6 text-center text-sm text-slate-400 border-t border-slate-200 dark:border-slate-800/60">
            &copy; {new Date().getFullYear()} PT Praven Bali Production. All rights reserved.
          </footer>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 rounded-2xl p-8 shadow-xl shadow-slate-200 dark:shadow-slate-900/50 animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <img src="/logo-bsb.png" alt="BSB Logo" className="w-10 h-10 rounded-xl shadow-md" />
            <div><h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Login Portal</h1><p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase">BSB Cashflow</p></div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 tracking-wide">Alamat Email</label>
              <input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/60 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all" placeholder="admin@pravenbali.com" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 tracking-wide">Kata Sandi</label>
              <input type="password" required value={loginPass} onChange={e => setLoginPass(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/60 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all" placeholder="••••••••" />
            </div>
            {loginError && <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 p-3 border border-rose-100 rounded-lg flex items-center gap-2"><ShieldCheck className="w-4 h-4 shrink-0" /> {loginError}</p>}
            <button type="submit" disabled={loginLoading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50">
              {loginLoading ? 'Memverifikasi...' : 'Masuk Sekarang'}
            </button>
            <button type="button" onClick={() => setShowLogin(false)} className="w-full text-center text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-medium pt-2">
              Kembali ke Beranda
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-800/60 border-t-emerald-600 rounded-full animate-spin" />
        <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-widest uppercase">Sinkronisasi Data...</p>
      </div>
    );
  }

  const ALL_TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Ringkasan', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'ledger', label: 'Jurnal Umum', icon: <BookOpen className="w-4 h-4" /> },
    { key: 'ledger-acc', label: 'Buku Besar', icon: <BookText className="w-4 h-4" /> },
    { key: 'neraca', label: 'Neraca Saldo', icon: <ClipboardList className="w-4 h-4" /> },
    { key: 'adjusting', label: 'Penyesuaian', icon: <Settings className="w-4 h-4" /> },
    { key: 'worksheet', label: 'Neraca Lajur', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { key: 'accounts', label: 'Daftar Akun', icon: <FolderOpen className="w-4 h-4" /> },
    { key: 'assets', label: 'Aktiva Tetap', icon: <Building2 className="w-4 h-4" /> },
  ];

  const TABS = ALL_TABS.filter(t => userRole !== 'guest' || ['dashboard', 'ledger', 'ledger-acc', 'accounts'].includes(t.key));

  const categoryColors: Record<string, string> = {
    Asset: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200',
    Liability: 'text-rose-700 bg-rose-50 dark:bg-rose-500/10 border-rose-200',
    Equity: 'text-violet-700 bg-violet-50 border-violet-200',
    Revenue: 'text-blue-700 bg-blue-50 dark:bg-blue-500/10 border-blue-200',
    Expense: 'text-amber-700 bg-amber-50 dark:bg-amber-500/10 border-amber-200',
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-24 font-sans selection:bg-emerald-500/20 dark:selection:bg-emerald-500/30  transition-colors duration-300">
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/60 px-4 py-3 shadow-sm transition-colors duration-300">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-bsb.png" alt="BSB Logo" className="w-9 h-9 rounded-xl shadow-sm" />
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">BSB Cashflow</h1>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold tracking-widest uppercase">PT Praven Bali</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {mounted && (
              <button onClick={toggleTheme} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                {resolvedTheme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            )}
            <ExcelExportButton trialBalance={trialBalance} userRole={userRole} currentUserId={currentUserId} />
            <div className="hidden sm:flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-medium border-l border-slate-200 dark:border-slate-800/60 pl-4">
              <span>{userEmail}</span>
              <button onClick={handleLogout} className="text-slate-400 hover:text-rose-600 dark:text-rose-400 transition-colors p-1" title="Logout">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="max-w-6xl mx-auto px-4 mt-6 overflow-x-auto hide-scrollbar">
        <div className="flex gap-1.5 p-1 min-w-max border-b border-slate-200 dark:border-slate-800/60">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all whitespace-nowrap border-b-2 -mb-[3px] ${tab === t.key ? 'text-emerald-700 dark:text-emerald-400 border-emerald-600 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 mt-6">
        {tab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Aset', value: totalAssets, color: 'emerald' },
                { label: 'Kewajiban', value: totalLiabilities, color: 'rose' },
                { label: 'Pendapatan', value: totalRevenue, color: 'blue' },
                { label: 'Laba Bersih', value: netIncome, color: netIncome >= 0 ? 'emerald' : 'rose' },
              ].map((card, i) => (
                <div key={i} className="glass-card p-5 relative overflow-hidden group">
                  <div className={`absolute top-0 right-0 w-2 h-full bg-${card.color}-500/20 group-hover:bg-${card.color}-500/40 transition-colors`} />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{card.label}</p>
                  <p className={`text-2xl font-extrabold mt-2 tracking-tight text-slate-900 dark:text-white`}>{fmtRp(card.value)}</p>
                </div>
              ))}
            </div>

            <button onClick={() => setShowModal(true)}
              className="w-full py-4 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-900 font-bold rounded-2xl text-sm transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" /> Tambah Transaksi Jurnal Baru
            </button>

            <div className={`glass-card p-5 flex items-center justify-between border-l-4 ${Math.abs(tbDebit - tbCredit) < 0.01 ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${Math.abs(tbDebit - tbCredit) < 0.01 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                  {Math.abs(tbDebit - tbCredit) < 0.01 ? <ShieldCheck className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Balance Check</p>
                  <p className={`text-sm font-bold mt-0.5 ${Math.abs(tbDebit - tbCredit) < 0.01 ? 'text-emerald-700' : 'text-rose-600 dark:text-rose-400'}`}>
                    {Math.abs(tbDebit - tbCredit) < 0.01 ? 'Neraca Seimbang (Balanced)' : 'TIDAK SEIMBANG!'}
                  </p>
                </div>
              </div>
              <div className="text-right text-xs space-y-1">
                <p className="text-slate-500 dark:text-slate-400">Σ Debit: <span className="font-bold text-slate-900 dark:text-white">{fmtRp(tbDebit)}</span></p>
                <p className="text-slate-500 dark:text-slate-400">Σ Credit: <span className="font-bold text-slate-900 dark:text-white">{fmtRp(tbCredit)}</span></p>
              </div>
            </div>

            <DashboardChart transactions={transactions} />

            <div className="glass-card p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Transaksi Terbaru</h3>
              </div>
              <div className="p-5 space-y-4 max-h-[400px] overflow-y-auto">
                {transactions.filter(t => !t.is_adjusting).length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-6">Belum ada transaksi.</p>
                ) : transactions.filter(t => !t.is_adjusting).map(tx => (
                  <div key={tx.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 rounded-xl hover:border-slate-300 dark:border-slate-700 transition-colors shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate">{tx.description}</p>
                        <div className="mt-3 space-y-1.5 border-t border-slate-100 dark:border-slate-800/50 pt-2">
                          {tx.journal_entries.map((je, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-slate-600 dark:text-slate-400 font-medium"><span className="text-slate-400 font-mono mr-1">{je.account_code}</span>{je.account_name}</span>
                              <div className="flex gap-4 font-mono">
                                <span className={je.debit > 0 ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-300'}>{je.debit > 0 ? fmtRp(je.debit) : '-'}</span>
                                <span className={je.credit > 0 ? 'text-slate-500 dark:text-slate-400' : 'text-slate-300'}>{je.credit > 0 ? fmtRp(je.credit) : '-'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button onClick={() => setEditingTransaction(tx)} className="text-slate-400 hover:text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:bg-blue-500/10 p-1.5 rounded-md transition-colors" title="Ubah">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteTx(tx.id)} className="text-slate-400 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:bg-rose-500/10 p-1.5 rounded-md transition-colors" title="Hapus">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'worksheet' && (
          <div className="animate-fade-in">
            <div className="glass-card p-0 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Neraca Lajur (Worksheet)</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Laporan 10 Kolom Akuntansi</p>
              </div>
              <Worksheet />
            </div>
          </div>
        )}

        {tab === 'ledger-acc' && (
          <LedgerByAccount userRole={userRole} currentUserId={currentUserId} />
        )}

        {tab === 'accounts' && (
          <div className="space-y-4 animate-fade-in">
            <ChartOfAccountsGrid />
          </div>
        )}

        {tab === 'assets' && (
          <div className="space-y-4 animate-fade-in">
            <FixedAssetsGrid />
          </div>
        )}

        {tab === 'neraca' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><ClipboardList className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Neraca Saldo (Trial Balance)</h2>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800/60">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800/60">
                      <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kode</th>
                      <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nama Akun</th>
                      <th className="text-center px-5 py-3.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kategori</th>
                      <th className="text-right px-5 py-3.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Debit</th>
                      <th className="text-right px-5 py-3.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Credit</th>
                      <th className="text-right px-5 py-3.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Saldo Akhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {trialBalance.map(row => (
                      <tr key={row.account_code} className="hover:bg-slate-50 dark:bg-slate-950/80 transition-colors">
                        <td className="px-5 py-3 font-mono font-bold text-slate-600 dark:text-slate-400">{row.account_code}</td>
                        <td className="px-5 py-3 text-slate-900 dark:text-white font-medium">{row.account_name}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${categoryColors[row.category] || 'text-slate-500 dark:text-slate-400'}`}>
                            {row.category}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-slate-900 dark:text-white">{row.total_debit > 0 ? fmtRp(row.total_debit) : '-'}</td>
                        <td className="px-5 py-3 text-right font-mono text-slate-500 dark:text-slate-400">{row.total_credit > 0 ? fmtRp(row.total_credit) : '-'}</td>
                        <td className={`px-5 py-3 text-right font-mono font-bold ${row.ending_balance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
                          {fmtRp(row.ending_balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-t-2 border-slate-200 dark:border-slate-800/60">
                      <td colSpan={3} className="px-5 py-4 font-bold text-slate-900 dark:text-white text-sm">TOTAL</td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-slate-900 dark:text-white">{fmtRp(tbDebit)}</td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-slate-900 dark:text-white">{fmtRp(tbCredit)}</td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-slate-900 dark:text-white">{fmtRp(tbDebit - tbCredit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'ledger' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Jurnal Umum (General Ledger)</h2>
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-900 font-semibold rounded-lg text-xs transition-all shadow-sm">
                <Plus className="w-3.5 h-3.5" /> Tambah Jurnal
              </button>
            </div>

            <div className="space-y-4">
              {transactions.filter(t => !t.is_adjusting).length === 0 ? (
                <div className="glass-card p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mb-4"><BookOpen className="w-8 h-8" /></div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Belum ada transaksi yang tercatat.</p>
                  <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors">
                    + Buat transaksi pertama
                  </button>
                </div>
              ) : transactions.filter(t => !t.is_adjusting).map(tx => (
                <div key={tx.id} className="glass-card p-0 overflow-hidden">
                  <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{new Date(tx.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{tx.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditingTransaction(tx)} className="text-slate-400 hover:text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:bg-blue-500/10 p-2 rounded-lg transition-colors" title="Ubah transaksi">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteTx(tx.id)} className="text-slate-400 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:bg-rose-500/10 p-2 rounded-lg transition-colors" title="Hapus transaksi">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-5 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/50">
                          <th className="text-left pb-2 pr-2">Akun</th>
                          <th className="text-right pb-2 px-2 w-32">Debit</th>
                          <th className="text-right pb-2 pl-2 w-32">Credit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {tx.journal_entries.map((je, i) => (
                          <tr key={i} className="group hover:bg-slate-50 dark:bg-slate-950/50 transition-colors">
                            <td className={`py-2 pr-2 ${je.credit > 0 ? 'pl-8' : ''}`}>
                              <span className="font-mono font-medium text-slate-400 mr-2 text-xs">{je.account_code}</span>
                              <span className="text-slate-800 dark:text-slate-200 font-medium">{je.account_name}</span>
                            </td>
                            <td className="py-2 px-2 text-right font-mono font-medium text-slate-900 dark:text-white">{je.debit > 0 ? fmtRp(je.debit) : ''}</td>
                            <td className="py-2 pl-2 text-right font-mono font-medium text-slate-500 dark:text-slate-400">{je.credit > 0 ? fmtRp(je.credit) : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'adjusting' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><Settings className="w-5 h-5 text-amber-600 dark:text-amber-400" /> Jurnal Penyesuaian</h2>
              <button onClick={() => setShowAdjModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs transition-all shadow-sm shadow-amber-600/20">
                <Plus className="w-3.5 h-3.5" /> Tambah Penyesuaian
              </button>
            </div>

            <div className="space-y-4">
              {transactions.filter(t => t.is_adjusting).length === 0 ? (
                <div className="glass-card p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mb-4"><Settings className="w-8 h-8" /></div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Belum ada jurnal penyesuaian yang tercatat.</p>
                  <button onClick={() => setShowAdjModal(true)} className="mt-4 px-4 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-700 rounded-lg text-sm font-bold hover:bg-amber-100 transition-colors">
                    + Buat jurnal penyesuaian
                  </button>
                </div>
              ) : transactions.filter(t => t.is_adjusting).map(tx => (
                <div key={tx.id} className="glass-card p-0 overflow-hidden border-t-4 border-t-amber-400">
                  <div className="px-5 py-3 bg-amber-50/30 border-b border-amber-100/50 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-amber-600/80">{new Date(tx.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{tx.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditingTransaction(tx)} className="text-slate-400 hover:text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:bg-blue-500/10 p-2 rounded-lg transition-colors" title="Ubah transaksi">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteTx(tx.id)} className="text-slate-400 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:bg-rose-500/10 p-2 rounded-lg transition-colors" title="Hapus transaksi">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-5 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/50">
                          <th className="text-left pb-2 pr-2">Akun</th>
                          <th className="text-right pb-2 px-2 w-32">Debit</th>
                          <th className="text-right pb-2 pl-2 w-32">Credit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {tx.journal_entries.map((je, i) => (
                          <tr key={i} className="group hover:bg-slate-50 dark:bg-slate-950/50 transition-colors">
                            <td className={`py-2 pr-2 ${je.credit > 0 ? 'pl-8' : ''}`}>
                              <span className="font-mono font-medium text-slate-400 mr-2 text-xs">{je.account_code}</span>
                              <span className="text-slate-800 dark:text-slate-200 font-medium">{je.account_name}</span>
                            </td>
                            <td className="py-2 px-2 text-right font-mono font-medium text-slate-900 dark:text-white">{je.debit > 0 ? fmtRp(je.debit) : ''}</td>
                            <td className="py-2 pl-2 text-right font-mono font-medium text-slate-500 dark:text-slate-400">{je.credit > 0 ? fmtRp(je.credit) : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800/60 px-4 py-3 flex items-center justify-between z-40">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate mr-4">{userEmail}</span>
        <button onClick={handleLogout} className="text-xs text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 rounded-md flex items-center gap-1">
          <LogOut className="w-3.5 h-3.5" /> Keluar
        </button>
      </div>

      {showModal && <TransactionModal accounts={accounts} onSubmit={handleCreateTx} onClose={() => setShowModal(false)} />}
      {showAdjModal && <TransactionModal accounts={accounts} onSubmit={handleCreateTx} onClose={() => setShowAdjModal(false)} isAdjustingMode />}
      {editingTransaction && (
        <TransactionModal
          accounts={accounts}
          initialData={{
            id: editingTransaction.id,
            description: editingTransaction.description,
            date: editingTransaction.date,
            is_adjusting: editingTransaction.is_adjusting,
            entries: editingTransaction.journal_entries.map(je => ({
              account_code: je.account_code,
              debit: je.debit,
              credit: je.credit
            }))
          }}
          onSubmit={handleUpdateTx}
          onClose={() => setEditingTransaction(null)}
          isAdjustingMode={editingTransaction.is_adjusting}
        />
      )}
    </div>
  );
}

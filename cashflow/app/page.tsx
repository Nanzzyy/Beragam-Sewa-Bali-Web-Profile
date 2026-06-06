'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Account, TrialBalanceRow, Transaction, JournalEntryWithAccount, JournalEntryInput } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { fetchAccounts, fetchTrialBalance, fetchTransactionsWithEntries, createTransaction, deleteTransaction } from '../lib/accounting';
import ExcelExportButton from '../components/ExcelExportButton';
import TransactionModal from '../components/TransactionModal';
import Worksheet from '../components/Worksheet';
import ChartOfAccountsGrid from '../components/ChartOfAccountsGrid';
import FixedAssetsGrid from '../components/FixedAssetsGrid';

type Tab = 'dashboard' | 'ledger' | 'neraca' | 'adjusting' | 'worksheet' | 'accounts' | 'assets';

type TxWithEntries = Transaction & { journal_entries: JournalEntryWithAccount[] };

export default function CashflowDashboard() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceRow[]>([]);
  const [transactions, setTransactions] = useState<TxWithEntries[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Check auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setAuthReady(true); setUserEmail(session.user.email || ''); }
      else setAuthReady(false);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
      if (session?.user) { setAuthReady(true); setUserEmail(session.user.email || ''); }
      else { setAuthReady(false); setUserEmail(''); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadData = useCallback(async () => {
    if (!authReady) return;
    setLoading(true);
    try {
      const [accs, tb, txs] = await Promise.all([
        fetchAccounts(),
        fetchTrialBalance(),
        fetchTransactionsWithEntries({ limit: 50 }),
      ]);
      setAccounts(accs);
      setTrialBalance(tb);
      setTransactions(txs);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [authReady]);

  useEffect(() => { loadData(); }, [loadData]);

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
  };

  const handleCreateTx = async (data: { description: string; date: string; entries: JournalEntryInput[] }) => {
    await createTransaction({ ...data }, accounts);
    await loadData();
  };

  const handleDeleteTx = async (id: string) => {
    if (!confirm('Hapus transaksi ini beserta seluruh jurnal entri?')) return;
    await deleteTransaction(id);
    await loadData();
  };

  // Summary stats
  const totalAssets = trialBalance.filter(r => r.category === 'Asset').reduce((s, r) => s + r.ending_balance, 0);
  const totalLiabilities = trialBalance.filter(r => r.category === 'Liability').reduce((s, r) => s + r.ending_balance, 0);
  const totalRevenue = trialBalance.filter(r => r.category === 'Revenue').reduce((s, r) => s + r.ending_balance, 0);
  const totalExpense = trialBalance.filter(r => r.category === 'Expense').reduce((s, r) => s + r.ending_balance, 0);
  const netIncome = totalRevenue - totalExpense;
  const tbDebit = trialBalance.reduce((s, r) => s + r.total_debit, 0);
  const tbCredit = trialBalance.reduce((s, r) => s + r.total_credit, 0);

  const fmtRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  // Login screen
  if (!authReady && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#06090F]">
        <div className="w-full max-w-sm glass-card rounded-2xl p-8 animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center font-black text-black text-lg shadow-lg shadow-emerald-500/30">B</div>
            <div><h1 className="text-base font-bold text-white">BSB CASHFLOW</h1><p className="text-[10px] text-emerald-400 font-semibold tracking-wider">DOUBLE-ENTRY LEDGER</p></div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Email</label>
              <input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" placeholder="admin@company.com" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Password</label>
              <input type="password" required value={loginPass} onChange={e => setLoginPass(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" placeholder="••••••••" />
            </div>
            {loginError && <p className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded-lg">⚠ {loginError}</p>}
            <button type="submit" disabled={loginLoading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50">
              {loginLoading ? 'Masuk...' : 'Masuk ke Sistem'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#06090F]">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-xs font-semibold text-slate-400 tracking-wider">MEMUAT DATA AKUNTANSI...</p>
      </div>
    );
  }

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'Ringkasan', icon: '📊' },
    { key: 'ledger', label: 'Jurnal Umum', icon: '📒' },
    { key: 'neraca', label: 'Neraca Saldo', icon: '📋' },
    { key: 'adjusting', label: 'Penyesuaian', icon: '⚙️' },
    { key: 'worksheet', label: 'Neraca Lajur', icon: '📄' },
    { key: 'accounts', label: 'Daftar Akun', icon: '🗂️' },
    { key: 'assets', label: 'Aktiva Tetap', icon: '🏢' },
  ];

  const categoryColors: Record<string, string> = {
    Asset: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    Liability: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    Equity: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    Revenue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    Expense: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };

  return (
    <div className="min-h-screen bg-[#06090F] text-slate-100 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#06090F]/85 border-b border-slate-800/60 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center font-black text-black text-lg shadow-md shadow-emerald-500/25">B</div>
            <div>
              <h1 className="text-sm font-bold tracking-wide">BSB CASHFLOW</h1>
              <p className="text-[9px] text-emerald-400 font-semibold tracking-widest">DOUBLE-ENTRY LEDGER · PT PRAVEN BALI</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ExcelExportButton trialBalance={trialBalance} />
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
              <span>{userEmail}</span>
              <button onClick={handleLogout} className="text-rose-400 hover:text-rose-300 font-semibold">Logout</button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="max-w-6xl mx-auto px-4 mt-4 overflow-x-auto hide-scrollbar">
        <div className="flex gap-1 bg-slate-900/60 border border-slate-800/60 rounded-xl p-1 min-w-max">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${tab === t.key ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-400 hover:text-slate-200'}`}>
              <span className="mr-1.5">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 mt-6">
        {/* ========= DASHBOARD TAB ========= */}
        {tab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Aset', value: totalAssets, color: 'emerald' },
                { label: 'Total Kewajiban', value: totalLiabilities, color: 'rose' },
                { label: 'Pendapatan', value: totalRevenue, color: 'blue' },
                { label: 'Laba Bersih', value: netIncome, color: netIncome >= 0 ? 'emerald' : 'rose' },
              ].map((card, i) => (
                <div key={i} className="glass-card rounded-2xl p-5 relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-20 h-20 bg-${card.color}-500/10 rounded-full blur-2xl`} />
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{card.label}</p>
                  <p className={`text-xl font-extrabold mt-2 text-${card.color}-400`}>{fmtRp(card.value)}</p>
                </div>
              ))}
            </div>

            {/* Quick Action */}
            <button onClick={() => setShowModal(true)}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-2xl text-sm transition-all shadow-xl shadow-emerald-600/20 active:scale-[0.99]">
              + Tambah Transaksi Jurnal Baru
            </button>

            {/* Balance Check */}
            <div className={`glass-card rounded-2xl p-5 flex items-center justify-between ${Math.abs(tbDebit - tbCredit) < 0.01 ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Balance Check</p>
                <p className={`text-sm font-bold mt-1 ${Math.abs(tbDebit - tbCredit) < 0.01 ? 'balance-ok' : 'balance-error'}`}>
                  {Math.abs(tbDebit - tbCredit) < 0.01 ? '✓ Neraca Seimbang (Balanced)' : '✗ TIDAK SEIMBANG!'}
                </p>
              </div>
              <div className="text-right text-xs space-y-1">
                <p className="text-slate-400">Σ Debit: <span className="font-bold text-emerald-400">{fmtRp(tbDebit)}</span></p>
                <p className="text-slate-400">Σ Credit: <span className="font-bold text-blue-400">{fmtRp(tbCredit)}</span></p>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-4">Transaksi Terbaru</h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {transactions.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-8">Belum ada transaksi.</p>
                ) : transactions.slice(0, 10).map(tx => (
                  <div key={tx.id} className="p-3 bg-slate-900/50 border border-slate-800/60 rounded-xl hover:border-slate-700/60 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500">{new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <p className="text-xs font-semibold text-white mt-1 truncate">{tx.description}</p>
                        <div className="mt-2 space-y-0.5">
                          {tx.journal_entries.map((je, i) => (
                            <div key={i} className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-400">{je.account_code} · {je.account_name}</span>
                              <div className="flex gap-4 font-mono">
                                <span className={je.debit > 0 ? 'text-emerald-400 font-semibold' : 'text-slate-600'}>{je.debit > 0 ? fmtRp(je.debit) : '-'}</span>
                                <span className={je.credit > 0 ? 'text-blue-400 font-semibold' : 'text-slate-600'}>{je.credit > 0 ? fmtRp(je.credit) : '-'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteTx(tx.id)} className="text-slate-600 hover:text-rose-400 p-1 transition-colors shrink-0" title="Hapus">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========= WORKSHEET TAB ========= */}
        {tab === 'worksheet' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Neraca Lajur (Worksheet)</h2>
            </div>
            <Worksheet />
          </div>
        )}

        {/* ========= ACCOUNTS TAB ========= */}
        {tab === 'accounts' && (
          <div className="space-y-4 animate-fade-in">
            <ChartOfAccountsGrid />
          </div>
        )}

        {/* ========= ASSETS TAB ========= */}
        {tab === 'assets' && (
          <div className="space-y-4 animate-fade-in">
            <FixedAssetsGrid />
          </div>
        )}

        {/* ========= NERACA SALDO TAB ========= */}
        {tab === 'neraca' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Neraca Saldo (Trial Balance)</h2>
              <p className="text-[10px] text-slate-400">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>

            {/* Table */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-800/60">
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kode</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Akun</th>
                      <th className="text-center px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kategori</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Debit</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Credit</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saldo Akhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {trialBalance.map(row => (
                      <tr key={row.account_code} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-300">{row.account_code}</td>
                        <td className="px-4 py-2.5 text-slate-200">{row.account_name}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${categoryColors[row.category] || 'text-slate-400'}`}>
                            {row.category}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{row.total_debit > 0 ? fmtRp(row.total_debit) : '-'}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-blue-400">{row.total_credit > 0 ? fmtRp(row.total_credit) : '-'}</td>
                        <td className={`px-4 py-2.5 text-right font-mono font-bold ${row.ending_balance >= 0 ? 'text-white' : 'text-rose-400'}`}>
                          {fmtRp(row.ending_balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800/40 border-t-2 border-emerald-500/30">
                      <td colSpan={3} className="px-4 py-3 font-bold text-white text-sm">TOTAL</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">{fmtRp(tbDebit)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-blue-400">{fmtRp(tbCredit)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-white">{fmtRp(tbDebit - tbCredit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========= JURNAL UMUM TAB ========= */}
        {tab === 'ledger' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Jurnal Umum (General Ledger)</h2>
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-all shadow-lg shadow-emerald-600/20">
                + Tambah Jurnal
              </button>
            </div>

            <div className="space-y-3">
              {transactions.filter(t => !t.is_adjusting).length === 0 ? (
                <div className="glass-card rounded-2xl p-12 text-center">
                  <p className="text-slate-500 text-sm">Belum ada transaksi yang tercatat.</p>
                  <button onClick={() => setShowModal(true)} className="mt-4 text-emerald-400 text-sm font-semibold hover:underline">
                    + Buat transaksi pertama
                  </button>
                </div>
              ) : transactions.filter(t => !t.is_adjusting).map(tx => (
                <div key={tx.id} className="glass-card rounded-2xl p-5 hover:border-slate-700/60 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      <p className="text-sm font-bold text-white mt-0.5">{tx.description}</p>
                    </div>
                    <button onClick={() => handleDeleteTx(tx.id)} className="text-slate-600 hover:text-rose-400 p-1.5 transition-colors" title="Hapus transaksi">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[9px] text-slate-500 uppercase">
                          <th className="text-left pb-2 pr-2">Akun</th>
                          <th className="text-right pb-2 px-2 w-28">Debit</th>
                          <th className="text-right pb-2 pl-2 w-28">Credit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/30">
                        {tx.journal_entries.map((je, i) => (
                          <tr key={i}>
                            <td className={`py-1.5 pr-2 ${je.credit > 0 ? 'pl-6' : ''}`}>
                              <span className="font-mono text-slate-400 mr-2">{je.account_code}</span>
                              <span className="text-slate-200">{je.account_name}</span>
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-emerald-400">{je.debit > 0 ? fmtRp(je.debit) : ''}</td>
                            <td className="py-1.5 pl-2 text-right font-mono text-blue-400">{je.credit > 0 ? fmtRp(je.credit) : ''}</td>
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

        {/* ========= JURNAL PENYESUAIAN TAB ========= */}
        {tab === 'adjusting' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Jurnal Penyesuaian (Adjusting Entries)</h2>
              <button onClick={() => setShowAdjModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl text-xs transition-all shadow-lg shadow-orange-600/20">
                + Tambah Penyesuaian
              </button>
            </div>

            <div className="space-y-3">
              {transactions.filter(t => t.is_adjusting).length === 0 ? (
                <div className="glass-card rounded-2xl p-12 text-center">
                  <p className="text-slate-500 text-sm">Belum ada jurnal penyesuaian yang tercatat.</p>
                  <button onClick={() => setShowAdjModal(true)} className="mt-4 text-orange-400 text-sm font-semibold hover:underline">
                    + Buat jurnal penyesuaian
                  </button>
                </div>
              ) : transactions.filter(t => t.is_adjusting).map(tx => (
                <div key={tx.id} className="glass-card rounded-2xl p-5 border-orange-500/10 hover:border-orange-500/40 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-orange-400/80">{new Date(tx.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      <p className="text-sm font-bold text-white mt-0.5">{tx.description}</p>
                    </div>
                    <button onClick={() => handleDeleteTx(tx.id)} className="text-slate-600 hover:text-rose-400 p-1.5 transition-colors" title="Hapus transaksi">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[9px] text-slate-500 uppercase">
                          <th className="text-left pb-2 pr-2">Akun</th>
                          <th className="text-right pb-2 px-2 w-28">Debit</th>
                          <th className="text-right pb-2 pl-2 w-28">Credit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/30">
                        {tx.journal_entries.map((je, i) => (
                          <tr key={i}>
                            <td className={`py-1.5 pr-2 ${je.credit > 0 ? 'pl-6' : ''}`}>
                              <span className="font-mono text-slate-400 mr-2">{je.account_code}</span>
                              <span className="text-slate-200">{je.account_name}</span>
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-orange-400">{je.debit > 0 ? fmtRp(je.debit) : ''}</td>
                            <td className="py-1.5 pl-2 text-right font-mono text-orange-400">{je.credit > 0 ? fmtRp(je.credit) : ''}</td>
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

      {/* Mobile Logout */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-[#06090F]/95 backdrop-blur-sm border-t border-slate-800/60 px-4 py-3 flex items-center justify-between">
        <span className="text-[10px] text-slate-500 truncate">{userEmail}</span>
        <button onClick={handleLogout} className="text-xs text-rose-400 font-semibold">Logout</button>
      </div>

      {/* Transaction Modal */}
      {showModal && <TransactionModal accounts={accounts} onSubmit={handleCreateTx} onClose={() => setShowModal(false)} />}
      
      {/* Adjusting Transaction Modal */}
      {showAdjModal && <TransactionModal accounts={accounts} onSubmit={handleCreateTx} onClose={() => setShowAdjModal(false)} isAdjustingMode />}
    </div>
  );
}

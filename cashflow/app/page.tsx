'use client';

import React, { useState, useEffect } from 'react';
import { ExcelExportButton } from '../components/ExcelExportButton';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

// Type definitions matching DB Schema
interface Category {
  id: string;
  name: string;
  type: 'inflow' | 'outflow';
}

interface Transaction {
  id: string;
  transaction_date: string;
  type: 'inflow' | 'outflow';
  category_id: string;
  category_name: string;
  amount: number;
  description: string;
}

// Initial Mock data for offline/standalone execution
const INITIAL_CATEGORIES: Category[] = [
  { id: '1', name: 'Event Client Rental', type: 'inflow' },
  { id: '2', name: 'Equipment Sale', type: 'inflow' },
  { id: '3', name: 'Operational Services', type: 'inflow' },
  { id: '4', name: 'Staff Salary', type: 'outflow' },
  { id: '5', name: 'Equipment Maintenance', type: 'outflow' },
  { id: '6', name: 'Office Rent & Utilities', type: 'outflow' }
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 'tx-1', transaction_date: '2026-05-10T10:00:00Z', type: 'inflow', category_id: '1', category_name: 'Event Client Rental', amount: 15500000, description: 'DP Sewa Sound & Lighting Wedding Uluwatu' },
  { id: 'tx-2', transaction_date: '2026-05-12T14:30:00Z', type: 'outflow', category_id: '4', category_name: 'Staff Salary', amount: 4800000, description: 'Gaji Crew Operational Event Wedding' },
  { id: 'tx-3', transaction_date: '2026-05-15T09:15:00Z', type: 'inflow', category_id: '1', category_name: 'Event Client Rental', amount: 8000000, description: 'Sewa Tenda & Kursi Event Gathering Sanur' },
  { id: 'tx-4', transaction_date: '2026-05-18T16:00:00Z', type: 'outflow', category_id: '5', category_name: 'Equipment Maintenance', amount: 2400000, description: 'Reparasi Genset 10KVA & Beli Kabel Power' },
  { id: 'tx-5', transaction_date: '2026-05-22T11:00:00Z', type: 'inflow', category_id: '2', category_name: 'Equipment Sale', amount: 3500000, description: 'Penjualan Speaker Aktif Bekas C-12' },
  { id: 'tx-6', transaction_date: '2026-05-25T18:45:00Z', type: 'outflow', category_id: '6', category_name: 'Office Rent & Utilities', type: 'outflow', amount: 1800000, description: 'Pembayaran Tagihan Listrik Gudang & Air' }
];

const MONTHLY_TREND_DATA = [
  { name: 'Jan', Inflow: 18200000, Outflow: 9500000 },
  { name: 'Feb', Inflow: 22000000, Outflow: 12000000 },
  { name: 'Mar', Inflow: 19500000, Outflow: 8800000 },
  { name: 'Apr', Inflow: 28500000, Outflow: 14500000 },
  { name: 'May', Inflow: 27000000, Outflow: 9000000 }
];

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function CashflowDashboard() {
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  
  // States for Modals/Forms
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  
  // Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'inflow' | 'outflow'>('inflow');
  
  // Transaction Form State
  const [txType, setTxType] = useState<'inflow' | 'outflow'>('inflow');
  const [txCategoryId, setTxCategoryId] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [txDate, setTxDate] = useState('');

  // Auto-fill category selection on form toggle
  useEffect(() => {
    const filtered = categories.filter(c => c.type === txType);
    if (filtered.length > 0) {
      setTxCategoryId(filtered[0].id);
    } else {
      setTxCategoryId('');
    }
  }, [txType, categories]);

  // Calculations
  const totalInflow = transactions
    .filter(t => t.type === 'inflow')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutflow = transactions
    .filter(t => t.type === 'outflow')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalInflow - totalOutflow;

  // Expense categories percentage breakdown
  const expenseBreakdown = categories
    .filter(c => c.type === 'outflow')
    .map(c => {
      const sum = transactions
        .filter(t => t.category_id === c.id)
        .reduce((s, t) => s + t.amount, 0);
      return { name: c.name, value: sum };
    })
    .filter(item => item.value > 0);

  // Handlers
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      type: newCatType
    };
    setCategories([...categories, newCat]);
    setNewCatName('');
    setIsCatModalOpen(false);
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || !txCategoryId) return;

    const selectedCat = categories.find(c => c.id === txCategoryId);
    
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      transaction_date: txDate ? new Date(txDate).toISOString() : new Date().toISOString(),
      type: txType,
      category_id: txCategoryId,
      category_name: selectedCat ? selectedCat.name : 'Lainnya',
      amount: parseFloat(txAmount),
      description: txDesc
    };

    setTransactions([newTx, ...transactions]);
    setTxAmount('');
    setTxDesc('');
    setTxDate('');
    setIsTxModalOpen(false);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 font-sans pb-12 selection:bg-emerald-500 selection:text-black">
      {/* 1. Header Navigation Bar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[#0F172A]/85 border-b border-slate-800/80 px-4 py-3 flex items-center justify-between max-w-lg mx-auto md:max-w-none md:px-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-black text-lg shadow-md shadow-emerald-500/25">
            B
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide">BSB CASHFLOW</h1>
            <p className="text-[10px] text-emerald-400 font-medium">OWNER ERP PLATFORM</p>
          </div>
        </div>
        
        {/* Excel Export Button Integration */}
        <ExcelExportButton transactions={transactions} />
      </header>

      {/* Main Container (Optimized for Mobile/Max-width) */}
      <main className="max-w-lg mx-auto px-4 mt-6 space-y-6 md:max-w-5xl md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
        
        {/* LEFT COLUMN: Overview Cards & Quick Actions */}
        <div className="space-y-6">
          
          {/* 2. Overview Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
            <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Saldo Bersih (Net Balance)</p>
            <h2 className="text-3xl font-extrabold text-white mt-1.5 tracking-tight">
              Rp {netBalance.toLocaleString('id-ID')}
            </h2>
            
            <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-slate-800/80">
              <div>
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Total Pemasukan</p>
                <p className="text-base font-bold text-emerald-400 mt-1">
                  Rp {totalInflow.toLocaleString('id-ID')}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Total Pengeluaran</p>
                <p className="text-base font-bold text-rose-500 mt-1">
                  Rp {totalOutflow.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>

          {/* 3. Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-3.5">
            <button
              onClick={() => { setTxType('inflow'); setIsTxModalOpen(true); }}
              className="flex items-center justify-center gap-2 py-3.5 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl transition-all font-semibold text-xs tracking-wider uppercase text-emerald-400"
            >
              <span className="text-sm">+</span> Pemasukan
            </button>
            <button
              onClick={() => { setTxType('outflow'); setIsTxModalOpen(true); }}
              className="flex items-center justify-center gap-2 py-3.5 bg-slate-900 border border-slate-800 hover:border-rose-500/50 rounded-xl transition-all font-semibold text-xs tracking-wider uppercase text-rose-400"
            >
              <span className="text-sm">-</span> Pengeluaran
            </button>
          </div>

          {/* 4. Chart Visualization Component (Monthly Trends) */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-lg">
            <h3 className="text-sm font-bold tracking-wide text-white mb-4">Tren Bulanan (Inflow vs Outflow)</h3>
            <div className="w-full h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MONTHLY_TREND_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#fff' }} />
                  <Area type="monotone" dataKey="Inflow" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorInflow)" />
                  <Area type="monotone" dataKey="Outflow" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorOutflow)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
        </div>

        {/* RIGHT COLUMN: Pie Chart Breakdown & Transaction Ledger */}
        <div className="space-y-6">

          {/* 5. Expense Breakdown Chart */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-lg">
            <h3 className="text-sm font-bold tracking-wide text-white mb-3 flex items-center justify-between">
              <span>Alokasi Pengeluaran</span>
              <button onClick={() => setIsCatModalOpen(true)} className="text-xs text-emerald-400 hover:underline">
                Kelola Kategori
              </button>
            </h3>
            {expenseBreakdown.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-xs text-slate-500">
                Belum ada data pengeluaran terdaftar.
              </div>
            ) : (
              <div className="flex items-center justify-between h-44">
                <div className="w-[50%] h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={55}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {expenseBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-[50%] overflow-y-auto max-h-36 pr-1 space-y-1.5">
                  {expenseBreakdown.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-[10px] text-slate-400 truncate max-w-[70px]">{item.name}</span>
                      <span className="text-[10px] font-semibold ml-auto text-slate-200">
                        {((item.value / totalOutflow) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 6. Transaction Ledger */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-lg">
            <h3 className="text-sm font-bold tracking-wide text-white mb-4">Daftar Transaksi (Ledger)</h3>
            <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
              {transactions.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500">
                  Tidak ada transaksi yang terdaftar.
                </div>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between gap-4 p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl hover:border-slate-700/50 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          tx.type === 'inflow' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {tx.category_name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(tx.transaction_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-200 mt-1.5 truncate">{tx.description || '-'}</p>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-3">
                      <p className={`text-xs font-bold ${tx.type === 'inflow' ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {tx.type === 'inflow' ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                      </p>
                      <button
                        onClick={() => handleDeleteTransaction(tx.id)}
                        className="text-slate-600 hover:text-rose-500 p-1 transition-colors"
                        title="Hapus"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </main>

      {/* --- ADD TRANSACTION MODAL --- */}
      {isTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h3 className="font-bold text-white text-base">Tambah {txType === 'inflow' ? 'Pemasukan' : 'Pengeluaran'}</h3>
              <button onClick={() => setIsTxModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>
            <form onSubmit={handleAddTransaction} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Jumlah (IDR)</label>
                <input
                  type="number"
                  required
                  placeholder="Rp 0"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="w-full bg-[#1E293B]/70 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Kategori</label>
                <select
                  required
                  value={txCategoryId}
                  onChange={(e) => setTxCategoryId(e.target.value)}
                  className="w-full bg-[#1E293B]/70 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {categories.filter(c => c.type === txType).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tanggal & Waktu</label>
                <input
                  type="datetime-local"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full bg-[#1E293B]/70 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Deskripsi / Catatan</label>
                <textarea
                  placeholder="Masukkan keterangan transaksi..."
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  className="w-full bg-[#1E293B]/70 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 h-16 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Foto Bukti Transfer/Kuitansi</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg text-sm transition-all"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MANAGE CATEGORIES MODAL --- */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h3 className="font-bold text-white text-base">Kelola Kategori Keuangan</h3>
              <button onClick={() => setIsCatModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>
            
            {/* Category List */}
            <div className="mt-4 max-h-36 overflow-y-auto space-y-2 pr-1">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg">
                  <span className="text-xs text-slate-200">{c.name}</span>
                  <span className={`text-[9px] font-bold uppercase ${c.type === 'inflow' ? 'text-emerald-400' : 'text-rose-500'}`}>
                    {c.type === 'inflow' ? 'Pemasukan' : 'Pengeluaran'}
                  </span>
                </div>
              ))}
            </div>

            {/* Create Category Form */}
            <form onSubmit={handleAddCategory} className="mt-5 pt-4 border-t border-slate-800/80 space-y-4">
              <p className="text-[11px] font-bold text-white uppercase tracking-wider">Tambah Kategori Baru</p>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nama Kategori</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Belanja Aset, Bonus"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-[#1E293B]/70 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Jenis Kategori</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCatType('inflow')}
                    className={`py-2 text-xs font-semibold rounded-lg border ${
                      newCatType === 'inflow' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    Pemasukan
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCatType('outflow')}
                    className={`py-2 text-xs font-semibold rounded-lg border ${
                      newCatType === 'outflow' ? 'bg-rose-500/10 text-rose-400 border-rose-500/40' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    Pengeluaran
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-xs transition-all"
              >
                Buat Kategori
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

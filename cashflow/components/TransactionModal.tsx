'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { Account, JournalEntryInput } from '../lib/supabase';
import { validateJournalEntries } from '../lib/accounting';
import { X, Plus, Trash2, AlertCircle } from 'lucide-react';

interface Props {
  accounts: Account[];
  onSubmit: (data: { description: string; date: string; is_adjusting?: boolean; entries: JournalEntryInput[] }) => Promise<void>;
  onClose: () => void;
  isAdjustingMode?: boolean;
}

const EMPTY_ENTRY: JournalEntryInput = { account_code: '', debit: 0, credit: 0 };

export default function TransactionModal({ accounts, onSubmit, onClose, isAdjustingMode = false }: Props) {
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState<JournalEntryInput[]>([
    { ...EMPTY_ENTRY },
    { ...EMPTY_ENTRY },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const groupedAccounts = useMemo(() => {
    const groups: Record<string, Account[]> = {};
    accounts.forEach(a => {
      if (!groups[a.category]) groups[a.category] = [];
      groups[a.category].push(a);
    });
    return groups;
  }, [accounts]);

  const totalDebit = entries.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (e.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const updateEntry = (idx: number, field: keyof JournalEntryInput, value: string | number) => {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
    setError('');
  };

  const addEntry = () => setEntries(prev => [...prev, { ...EMPTY_ENTRY }]);
  const removeEntry = (idx: number) => {
    if (entries.length <= 2) return;
    setEntries(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!description.trim()) { setError('Deskripsi transaksi wajib diisi.'); return; }
    if (!date) { setError('Tanggal transaksi wajib diisi.'); return; }

    const cleanEntries = entries.map(en => ({
      account_code: en.account_code,
      debit: Number(en.debit) || 0,
      credit: Number(en.credit) || 0,
    }));

    const validation = validateJournalEntries(cleanEntries, accounts);
    if (!validation.valid) { setError(validation.error!); return; }

    setSubmitting(true);
    try {
      await onSubmit({ description: description.trim(), date, is_adjusting: isAdjustingMode, entries: cleanEntries });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan transaksi.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const inputCls = "w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/60 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:bg-white dark:bg-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900 dark:bg-slate-100/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/50">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">{isAdjustingMode ? 'Jurnal Penyesuaian Baru' : 'Jurnal Umum Baru'}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Double-entry — Debit harus sama dengan Credit</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 tracking-wide">Deskripsi Transaksi</label>
              <input type="text" required value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Contoh: Pembayaran kontrak event wedding" className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 tracking-wide">Tanggal</label>
              <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Baris Jurnal</label>
              <button type="button" onClick={addEntry}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-xs text-emerald-700 hover:bg-emerald-100 rounded-lg font-semibold transition-colors">
                <Plus className="w-3.5 h-3.5" /> Tambah Baris
              </button>
            </div>

            <div className="grid grid-cols-[1fr_2fr_1fr_1fr_auto] gap-2 mb-2 px-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">No</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Akun</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase text-right">Debit (Rp)</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase text-right">Credit (Rp)</span>
              <span className="w-8"></span>
            </div>

            <div className="space-y-2">
              {entries.map((entry, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_2fr_1fr_1fr_auto] gap-2 items-center animate-fade-in group">
                  <span className="text-xs text-slate-400 text-center font-mono font-medium">{idx + 1}</span>

                  <select
                    required
                    value={entry.account_code}
                    onChange={e => updateEntry(idx, 'account_code', e.target.value)}
                    className={`${inputCls} ${!entry.account_code ? 'text-slate-400' : ''}`}
                  >
                    <option value="">— Pilih Akun —</option>
                    {Object.entries(groupedAccounts).map(([cat, accs]) => (
                      <optgroup key={cat} label={`━━ ${cat} ━━`}>
                        {accs.map(a => (
                          <option key={a.account_code} value={a.account_code}>
                            [{a.account_code}] {a.account_name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={entry.debit > 0 ? entry.debit.toLocaleString('id-ID') : ''}
                    onChange={e => {
                      const val = Number(e.target.value.replace(/[^0-9]/g, '')) || 0;
                      updateEntry(idx, 'debit', val);
                      if (val > 0) updateEntry(idx, 'credit', 0);
                    }}
                    placeholder="0"
                    className={`${inputCls} text-right font-mono font-medium ${entry.debit > 0 ? 'bg-emerald-50/50 border-emerald-200' : ''}`}
                  />

                  <input
                    type="text"
                    value={entry.credit > 0 ? entry.credit.toLocaleString('id-ID') : ''}
                    onChange={e => {
                      const val = Number(e.target.value.replace(/[^0-9]/g, '')) || 0;
                      updateEntry(idx, 'credit', val);
                      if (val > 0) updateEntry(idx, 'debit', 0);
                    }}
                    placeholder="0"
                    className={`${inputCls} text-right font-mono font-medium ${entry.credit > 0 ? 'bg-blue-50/50 border-blue-200' : ''}`}
                  />

                  <button type="button" onClick={() => removeEntry(idx)} disabled={entries.length <= 2}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:bg-rose-500/10 disabled:opacity-20 transition-colors rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className={`mt-5 p-4 rounded-xl border ${isBalanced ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10' : totalDebit > 0 || totalCredit > 0 ? 'border-rose-200 bg-rose-50 dark:bg-rose-500/10' : 'border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-950'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isBalanced ? 'text-emerald-700' : totalDebit > 0 || totalCredit > 0 ? 'text-rose-700' : 'text-slate-500 dark:text-slate-400'}`}>
                  {isBalanced ? '✓ SEIMBANG' : totalDebit > 0 || totalCredit > 0 ? '✗ TIDAK SEIMBANG' : 'TOTAL'}
                </span>
                <div className="flex items-center gap-6 font-mono text-sm">
                  <span className={`font-bold ${totalDebit > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                    D: Rp. {totalDebit.toLocaleString('id-ID')}
                  </span>
                  <span className={`font-bold ${totalCredit > 0 ? 'text-blue-700' : 'text-slate-400'}`}>
                    C: Rp. {totalCredit.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
              {!isBalanced && (totalDebit > 0 || totalCredit > 0) && (
                <p className="text-xs font-medium text-rose-600 dark:text-rose-400 mt-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Selisih: Rp. {Math.abs(totalDebit - totalCredit).toLocaleString('id-ID')}
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm transition-colors">
              Batal
            </button>
            <button type="submit" disabled={submitting || !isBalanced}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-emerald-600/20">
              {submitting ? 'Menyimpan...' : 'Simpan Jurnal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

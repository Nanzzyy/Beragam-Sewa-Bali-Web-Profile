'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { Account, JournalEntryInput } from '../lib/supabase';
import { validateJournalEntries } from '../lib/accounting';

interface Props {
  accounts: Account[];
  onSubmit: (data: { description: string; date: string; entries: JournalEntryInput[] }) => Promise<void>;
  onClose: () => void;
}

const EMPTY_ENTRY: JournalEntryInput = { account_code: '', debit: 0, credit: 0 };

export default function TransactionModal({ accounts, onSubmit, onClose }: Props) {
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState<JournalEntryInput[]>([
    { ...EMPTY_ENTRY },
    { ...EMPTY_ENTRY },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Group accounts by category for the dropdown
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
      await onSubmit({ description: description.trim(), date, entries: cleanEntries });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan transaksi.');
    } finally {
      setSubmitting(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const inputCls = "w-full bg-slate-900/80 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#0F172A] border border-slate-700/50 rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-white text-lg">Jurnal Umum Baru</h3>
            <p className="text-xs text-slate-400 mt-0.5">Double-entry — Debit harus sama dengan Credit</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Description & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Deskripsi Transaksi</label>
              <input type="text" required value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Contoh: Pembayaran kontrak event wedding" className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Tanggal</label>
              <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Journal Entry Lines */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Baris Jurnal</label>
              <button type="button" onClick={addEntry}
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Tambah Baris
              </button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[1fr_2fr_1fr_1fr_auto] gap-2 mb-2 px-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase">No</span>
              <span className="text-[9px] font-bold text-slate-500 uppercase">Akun</span>
              <span className="text-[9px] font-bold text-slate-500 uppercase text-right">Debit (Rp)</span>
              <span className="text-[9px] font-bold text-slate-500 uppercase text-right">Credit (Rp)</span>
              <span className="w-7"></span>
            </div>

            {/* Entry Rows */}
            <div className="space-y-2">
              {entries.map((entry, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_2fr_1fr_1fr_auto] gap-2 items-center animate-fade-in">
                  <span className="text-xs text-slate-500 text-center font-mono">{idx + 1}</span>

                  {/* Account Dropdown — strict selection, no raw text */}
                  <select
                    required
                    value={entry.account_code}
                    onChange={e => updateEntry(idx, 'account_code', e.target.value)}
                    className={`${inputCls} ${!entry.account_code ? 'text-slate-500' : ''}`}
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

                  {/* Debit */}
                  <input
                    type="number" min="0" step="1"
                    value={entry.debit || ''}
                    onChange={e => {
                      const val = Number(e.target.value) || 0;
                      updateEntry(idx, 'debit', val);
                      if (val > 0) updateEntry(idx, 'credit', 0);
                    }}
                    placeholder="0"
                    className={`${inputCls} text-right font-mono ${entry.debit > 0 ? 'border-emerald-500/40 bg-emerald-500/5' : ''}`}
                  />

                  {/* Credit */}
                  <input
                    type="number" min="0" step="1"
                    value={entry.credit || ''}
                    onChange={e => {
                      const val = Number(e.target.value) || 0;
                      updateEntry(idx, 'credit', val);
                      if (val > 0) updateEntry(idx, 'debit', 0);
                    }}
                    placeholder="0"
                    className={`${inputCls} text-right font-mono ${entry.credit > 0 ? 'border-blue-500/40 bg-blue-500/5' : ''}`}
                  />

                  {/* Remove */}
                  <button type="button" onClick={() => removeEntry(idx)} disabled={entries.length <= 2}
                    className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-rose-400 disabled:opacity-20 transition-colors rounded">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Balance Summary Bar */}
            <div className={`mt-4 p-3 rounded-xl border ${isBalanced ? 'border-emerald-500/30 bg-emerald-500/5' : totalDebit > 0 || totalCredit > 0 ? 'border-rose-500/30 bg-rose-500/5' : 'border-slate-700/40 bg-slate-800/30'}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {isBalanced ? '✓ SEIMBANG' : totalDebit > 0 || totalCredit > 0 ? '✗ TIDAK SEIMBANG' : 'TOTAL'}
                </span>
                <div className="flex items-center gap-6 font-mono text-sm">
                  <span className={`font-bold ${totalDebit > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    D: Rp {totalDebit.toLocaleString('id-ID')}
                  </span>
                  <span className={`font-bold ${totalCredit > 0 ? 'text-blue-400' : 'text-slate-500'}`}>
                    C: Rp {totalCredit.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
              {!isBalanced && (totalDebit > 0 || totalCredit > 0) && (
                <p className="text-[10px] text-rose-400 mt-1">
                  Selisih: Rp {Math.abs(totalDebit - totalCredit).toLocaleString('id-ID')}
                </p>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 animate-fade-in">
              ⚠ {error}
            </div>
          )}

          {/* Submit */}
          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-sm transition-colors">
              Batal
            </button>
            <button type="submit" disabled={submitting || !isBalanced}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-600/20">
              {submitting ? 'Menyimpan...' : 'Simpan Jurnal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

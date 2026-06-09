'use client';

import { useState, useEffect } from 'react';
import { fetchAccounts, fetchTransactionsWithEntries } from '../lib/accounting';
import type { Account, Transaction, JournalEntryWithAccount } from '../lib/supabase';
import { Loader2, Search, BookText } from 'lucide-react';

type TxWithEntries = Transaction & { journal_entries: JournalEntryWithAccount[] };

export default function LedgerByAccount() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<TxWithEntries[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    async function load() {
      try {
        const [accs, txs] = await Promise.all([
          fetchAccounts(),
          fetchTransactionsWithEntries()
        ]);
        setAccounts(accs);
        setTransactions(txs.sort((a, b) => {
          const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
          if (dateDiff === 0) {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          }
          return dateDiff;
        }));
        if (accs.length > 0) setSelectedCode(accs[0].account_code);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div className="p-12 flex flex-col items-center justify-center text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin mb-4" />
      <p className="text-sm font-medium">Memuat Buku Besar...</p>
    </div>
  );

  const selectedAccount = accounts.find(a => a.account_code === selectedCode);
  
  // Filter transactions that contain the selected account
  let runningBalance = 0;
  const ledgerEntries = transactions.flatMap(tx => {
    const entriesForAccount = (tx.journal_entries as JournalEntryWithAccount[] || []).filter(je => je.account_code === selectedCode);
    return entriesForAccount.map(je => {
      if (selectedAccount?.normal_balance === 'Debet') {
        runningBalance += je.debit - je.credit;
      } else {
        runningBalance += je.credit - je.debit;
      }
      return {
        ...tx,
        ...je,
        runningBalance
      };
    });
  });

  // Filter by search query
  const filteredEntries = ledgerEntries.filter(entry => 
    entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    new Date(entry.date).toLocaleDateString('id-ID').includes(searchQuery)
  );

  const fmt = (num: number) => num === 0 ? '-' : `Rp${Math.abs(num).toLocaleString('id-ID')}`;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BookText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Buku Besar (Detail Akun)
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <select 
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm"
          >
            {accounts.map(acc => (
              <option key={acc.account_code} value={acc.account_code}>
                {acc.account_code} - {acc.account_name}
              </option>
            ))}
          </select>
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text"
              placeholder="Cari transaksi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-64 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="glass-card p-5 flex items-center justify-between border-l-4 border-l-indigo-500 mb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Saldo Akhir Akun</p>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{selectedAccount?.account_name}</h3>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Normal: {selectedAccount?.normal_balance}</p>
          <h3 className={`text-xl font-extrabold mt-1 ${runningBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {runningBalance < 0 ? '-' : ''}{fmt(Math.abs(runningBalance))}
          </h3>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold tracking-wider border-b border-slate-200 dark:border-slate-800/60">
            <tr>
              <th className="px-5 py-3">Tanggal</th>
              <th className="px-5 py-3">Keterangan</th>
              <th className="px-5 py-3 text-right">Debit</th>
              <th className="px-5 py-3 text-right">Kredit</th>
              <th className="px-5 py-3 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
                  Tidak ada transaksi untuk akun ini.
                </td>
              </tr>
            ) : filteredEntries.map((entry, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-950/50 transition-colors">
                <td className="px-5 py-3 whitespace-nowrap">{new Date(entry.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{entry.description}</td>
                <td className="px-5 py-3 text-right font-mono text-slate-600 dark:text-slate-400">{fmt(entry.debit)}</td>
                <td className="px-5 py-3 text-right font-mono text-slate-600 dark:text-slate-400">{fmt(entry.credit)}</td>
                <td className={`px-5 py-3 text-right font-mono font-bold ${entry.runningBalance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
                  {fmt(entry.runningBalance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

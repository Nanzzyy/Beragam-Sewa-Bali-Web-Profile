'use client';

import { useState, useEffect } from 'react';
import { fetchGeneralLedger, fetchAccounts } from '../lib/accounting';
import type { GeneralLedgerRow, Account } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

export default function Worksheet() {
  const [ledger, setLedger] = useState<GeneralLedgerRow[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [glData, accData] = await Promise.all([
          fetchGeneralLedger(),
          fetchAccounts()
        ]);
        setLedger(glData);
        setAccounts(accData);
      } catch (err) {
        console.error('Failed to load worksheet data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return (
    <div className="p-12 flex flex-col items-center justify-center text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin mb-4" />
      <p className="text-sm font-medium">Memuat Neraca Lajur...</p>
    </div>
  );

  const rows = accounts.map(acc => {
    const accountEntries = ledger.filter(l => l.account_code === acc.account_code);
    
    const normalEntries = accountEntries.filter(l => !l.is_adjusting);
    const unadjustedDebit = normalEntries.reduce((sum, e) => sum + e.debit, 0);
    const unadjustedCredit = normalEntries.reduce((sum, e) => sum + e.credit, 0);
    
    let unadjustedBal = 0;
    if (['Asset', 'Expense'].includes(acc.category)) {
      unadjustedBal = unadjustedDebit - unadjustedCredit;
    } else {
      unadjustedBal = unadjustedCredit - unadjustedDebit;
    }
    const unAdjD = ['Asset', 'Expense'].includes(acc.category) && unadjustedBal > 0 ? unadjustedBal : (unadjustedBal < 0 && !['Asset', 'Expense'].includes(acc.category) ? Math.abs(unadjustedBal) : 0);
    const unAdjC = ['Liability', 'Equity', 'Revenue'].includes(acc.category) && unadjustedBal > 0 ? unadjustedBal : (unadjustedBal < 0 && ['Asset', 'Expense'].includes(acc.category) ? Math.abs(unadjustedBal) : 0);

    const adjEntries = accountEntries.filter(l => l.is_adjusting);
    const adjDebit = adjEntries.reduce((sum, e) => sum + e.debit, 0);
    const adjCredit = adjEntries.reduce((sum, e) => sum + e.credit, 0);

    const totalDebit = unadjustedDebit + adjDebit;
    const totalCredit = unadjustedCredit + adjCredit;
    let adjBal = 0;
    if (['Asset', 'Expense'].includes(acc.category)) {
      adjBal = totalDebit - totalCredit;
    } else {
      adjBal = totalCredit - totalDebit;
    }
    const adjBalD = ['Asset', 'Expense'].includes(acc.category) && adjBal > 0 ? adjBal : (adjBal < 0 && !['Asset', 'Expense'].includes(acc.category) ? Math.abs(adjBal) : 0);
    const adjBalC = ['Liability', 'Equity', 'Revenue'].includes(acc.category) && adjBal > 0 ? adjBal : (adjBal < 0 && ['Asset', 'Expense'].includes(acc.category) ? Math.abs(adjBal) : 0);

    const isIncomeStatement = ['Revenue', 'Expense'].includes(acc.category);
    const isD = isIncomeStatement ? adjBalD : 0;
    const isC = isIncomeStatement ? adjBalC : 0;

    const isBalanceSheet = ['Asset', 'Liability', 'Equity'].includes(acc.category);
    const bsD = isBalanceSheet ? adjBalD : 0;
    const bsC = isBalanceSheet ? adjBalC : 0;

    return {
      code: acc.account_code,
      name: acc.account_name,
      unAdjD, unAdjC,
      adjDebit, adjCredit,
      adjBalD, adjBalC,
      isD, isC,
      bsD, bsC
    };
  }).filter(r => r.unAdjD || r.unAdjC || r.adjDebit || r.adjCredit || r.adjBalD || r.adjBalC);

  const totals = rows.reduce((acc, row) => ({
    unAdjD: acc.unAdjD + row.unAdjD,
    unAdjC: acc.unAdjC + row.unAdjC,
    adjDebit: acc.adjDebit + row.adjDebit,
    adjCredit: acc.adjCredit + row.adjCredit,
    adjBalD: acc.adjBalD + row.adjBalD,
    adjBalC: acc.adjBalC + row.adjBalC,
    isD: acc.isD + row.isD,
    isC: acc.isC + row.isC,
    bsD: acc.bsD + row.bsD,
    bsC: acc.bsC + row.bsC,
  }), {
    unAdjD: 0, unAdjC: 0, adjDebit: 0, adjCredit: 0, adjBalD: 0, adjBalC: 0, isD: 0, isC: 0, bsD: 0, bsC: 0
  });

  const netIncome = totals.isC - totals.isD;
  const formatCurrency = (val: number) => val === 0 ? '-' : `Rp. ${val.toLocaleString('id-ID')}`;

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-[11px] text-left text-slate-600">
        <thead className="text-[10px] uppercase bg-slate-50 text-slate-500 font-bold tracking-wider">
          <tr>
            <th rowSpan={2} className="px-4 py-3 whitespace-nowrap border-b border-slate-200">Kode</th>
            <th rowSpan={2} className="px-4 py-3 whitespace-nowrap border-b border-slate-200">Nama Akun</th>
            <th colSpan={2} className="px-4 py-3 text-center border-l border-b border-slate-200">Neraca Saldo (Unadjusted)</th>
            <th colSpan={2} className="px-4 py-3 text-center border-l border-b border-slate-200">Penyesuaian</th>
            <th colSpan={2} className="px-4 py-3 text-center border-l border-b border-slate-200">Neraca Saldo Disesuaikan</th>
            <th colSpan={2} className="px-4 py-3 text-center border-l border-b border-slate-200">Laba Rugi</th>
            <th colSpan={2} className="px-4 py-3 text-center border-l border-b border-slate-200">Neraca</th>
          </tr>
          <tr>
            <th className="px-4 py-2 text-right border-l border-slate-200 border-b border-slate-200">Debit</th>
            <th className="px-4 py-2 text-right border-b border-slate-200">Kredit</th>
            <th className="px-4 py-2 text-right border-l border-slate-200 border-b border-slate-200">Debit</th>
            <th className="px-4 py-2 text-right border-b border-slate-200">Kredit</th>
            <th className="px-4 py-2 text-right border-l border-slate-200 border-b border-slate-200">Debit</th>
            <th className="px-4 py-2 text-right border-b border-slate-200">Kredit</th>
            <th className="px-4 py-2 text-right border-l border-slate-200 border-b border-slate-200">Debit</th>
            <th className="px-4 py-2 text-right border-b border-slate-200">Kredit</th>
            <th className="px-4 py-2 text-right border-l border-slate-200 border-b border-slate-200">Debit</th>
            <th className="px-4 py-2 text-right border-b border-slate-200">Kredit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(row => (
            <tr key={row.code} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-2.5 whitespace-nowrap font-mono font-medium text-slate-500">{row.code}</td>
              <td className="px-4 py-2.5 whitespace-nowrap font-medium text-slate-800">{row.name}</td>
              <td className="px-4 py-2.5 text-right font-mono border-l border-slate-100">{formatCurrency(row.unAdjD)}</td>
              <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(row.unAdjC)}</td>
              <td className="px-4 py-2.5 text-right font-mono border-l border-slate-100 text-amber-600 font-medium">{formatCurrency(row.adjDebit)}</td>
              <td className="px-4 py-2.5 text-right font-mono text-amber-600 font-medium">{formatCurrency(row.adjCredit)}</td>
              <td className="px-4 py-2.5 text-right font-mono border-l border-slate-100">{formatCurrency(row.adjBalD)}</td>
              <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(row.adjBalC)}</td>
              <td className="px-4 py-2.5 text-right font-mono border-l border-slate-100 text-rose-600">{formatCurrency(row.isD)}</td>
              <td className="px-4 py-2.5 text-right font-mono text-emerald-600">{formatCurrency(row.isC)}</td>
              <td className="px-4 py-2.5 text-right font-mono border-l border-slate-100 text-blue-600">{formatCurrency(row.bsD)}</td>
              <td className="px-4 py-2.5 text-right font-mono text-purple-600">{formatCurrency(row.bsC)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
          <tr>
            <td colSpan={2} className="px-4 py-3.5 text-right text-slate-800">TOTAL</td>
            <td className="px-4 py-3.5 text-right font-mono border-l border-slate-200">{formatCurrency(totals.unAdjD)}</td>
            <td className="px-4 py-3.5 text-right font-mono">{formatCurrency(totals.unAdjC)}</td>
            <td className="px-4 py-3.5 text-right font-mono border-l border-slate-200 text-amber-700">{formatCurrency(totals.adjDebit)}</td>
            <td className="px-4 py-3.5 text-right font-mono text-amber-700">{formatCurrency(totals.adjCredit)}</td>
            <td className="px-4 py-3.5 text-right font-mono border-l border-slate-200">{formatCurrency(totals.adjBalD)}</td>
            <td className="px-4 py-3.5 text-right font-mono">{formatCurrency(totals.adjBalC)}</td>
            <td className="px-4 py-3.5 text-right font-mono border-l border-slate-200 text-rose-700">{formatCurrency(totals.isD)}</td>
            <td className="px-4 py-3.5 text-right font-mono text-emerald-700">{formatCurrency(totals.isC)}</td>
            <td className="px-4 py-3.5 text-right font-mono border-l border-slate-200 text-blue-700">{formatCurrency(totals.bsD)}</td>
            <td className="px-4 py-3.5 text-right font-mono text-purple-700">{formatCurrency(totals.bsC)}</td>
          </tr>
          {netIncome !== 0 && (
            <tr className="bg-emerald-50 border-t border-emerald-100">
              <td colSpan={2} className="px-4 py-3.5 text-right text-emerald-800">LABA BERSIH (NET INCOME)</td>
              <td colSpan={6} className="px-4 py-3.5 border-l border-slate-200"></td>
              <td className="px-4 py-3.5 text-right font-mono border-l border-slate-200 text-emerald-700">{netIncome > 0 ? formatCurrency(netIncome) : '-'}</td>
              <td className="px-4 py-3.5 text-right font-mono text-rose-700">{netIncome < 0 ? formatCurrency(Math.abs(netIncome)) : '-'}</td>
              <td className="px-4 py-3.5 text-right font-mono border-l border-slate-200 text-emerald-700">{netIncome > 0 ? formatCurrency(netIncome) : '-'}</td>
              <td className="px-4 py-3.5 text-right font-mono text-rose-700">{netIncome < 0 ? formatCurrency(Math.abs(netIncome)) : '-'}</td>
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  );
}

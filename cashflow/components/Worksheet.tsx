'use client';

import { useState, useEffect } from 'react';
import { fetchGeneralLedger, fetchAccounts } from '../lib/accounting';
import type { GeneralLedgerRow, Account } from '../lib/supabase';

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

  if (loading) return <div className="p-8 text-center text-gray-400">Memuat Neraca Lajur...</div>;

  // Aggregate Data
  const rows = accounts.map(acc => {
    const accountEntries = ledger.filter(l => l.account_code === acc.account_code);
    
    // Normal Transactions (Unadjusted)
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

    // Adjustments
    const adjEntries = accountEntries.filter(l => l.is_adjusting);
    const adjDebit = adjEntries.reduce((sum, e) => sum + e.debit, 0);
    const adjCredit = adjEntries.reduce((sum, e) => sum + e.credit, 0);

    // Adjusted Balance
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

    // Income Statement (Laba Rugi) - Revenue & Expense
    const isIncomeStatement = ['Revenue', 'Expense'].includes(acc.category);
    const isD = isIncomeStatement ? adjBalD : 0;
    const isC = isIncomeStatement ? adjBalC : 0;

    // Balance Sheet (Neraca) - Asset, Liability, Equity
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

  // Totals
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
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
      <table className="w-full text-sm text-left text-gray-300">
        <thead className="text-xs uppercase bg-white/10 text-gray-200">
          <tr>
            <th rowSpan={2} className="px-4 py-3 whitespace-nowrap">Kode</th>
            <th rowSpan={2} className="px-4 py-3 whitespace-nowrap">Nama Akun</th>
            <th colSpan={2} className="px-4 py-3 text-center border-l border-white/10">Neraca Saldo (Unadjusted)</th>
            <th colSpan={2} className="px-4 py-3 text-center border-l border-white/10">Penyesuaian</th>
            <th colSpan={2} className="px-4 py-3 text-center border-l border-white/10">Neraca Saldo Disesuaikan</th>
            <th colSpan={2} className="px-4 py-3 text-center border-l border-white/10">Laba Rugi</th>
            <th colSpan={2} className="px-4 py-3 text-center border-l border-white/10">Neraca</th>
          </tr>
          <tr>
            <th className="px-4 py-2 text-right border-l border-white/10 border-t">Debit</th>
            <th className="px-4 py-2 text-right border-t border-white/10">Kredit</th>
            <th className="px-4 py-2 text-right border-l border-white/10 border-t">Debit</th>
            <th className="px-4 py-2 text-right border-t border-white/10">Kredit</th>
            <th className="px-4 py-2 text-right border-l border-white/10 border-t">Debit</th>
            <th className="px-4 py-2 text-right border-t border-white/10">Kredit</th>
            <th className="px-4 py-2 text-right border-l border-white/10 border-t">Debit</th>
            <th className="px-4 py-2 text-right border-t border-white/10">Kredit</th>
            <th className="px-4 py-2 text-right border-l border-white/10 border-t">Debit</th>
            <th className="px-4 py-2 text-right border-t border-white/10">Kredit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map(row => (
            <tr key={row.code} className="hover:bg-white/5 transition-colors">
              <td className="px-4 py-2 whitespace-nowrap">{row.code}</td>
              <td className="px-4 py-2 whitespace-nowrap">{row.name}</td>
              <td className="px-4 py-2 text-right font-mono border-l border-white/5">{formatCurrency(row.unAdjD)}</td>
              <td className="px-4 py-2 text-right font-mono">{formatCurrency(row.unAdjC)}</td>
              <td className="px-4 py-2 text-right font-mono border-l border-white/5">{formatCurrency(row.adjDebit)}</td>
              <td className="px-4 py-2 text-right font-mono">{formatCurrency(row.adjCredit)}</td>
              <td className="px-4 py-2 text-right font-mono border-l border-white/5">{formatCurrency(row.adjBalD)}</td>
              <td className="px-4 py-2 text-right font-mono">{formatCurrency(row.adjBalC)}</td>
              <td className="px-4 py-2 text-right font-mono border-l border-white/5 text-rose-400">{formatCurrency(row.isD)}</td>
              <td className="px-4 py-2 text-right font-mono text-emerald-400">{formatCurrency(row.isC)}</td>
              <td className="px-4 py-2 text-right font-mono border-l border-white/5 text-blue-400">{formatCurrency(row.bsD)}</td>
              <td className="px-4 py-2 text-right font-mono text-purple-400">{formatCurrency(row.bsC)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-white/10 font-bold border-t border-white/20">
          <tr>
            <td colSpan={2} className="px-4 py-3 text-right">TOTAL</td>
            <td className="px-4 py-3 text-right font-mono border-l border-white/10">{formatCurrency(totals.unAdjD)}</td>
            <td className="px-4 py-3 text-right font-mono">{formatCurrency(totals.unAdjC)}</td>
            <td className="px-4 py-3 text-right font-mono border-l border-white/10">{formatCurrency(totals.adjDebit)}</td>
            <td className="px-4 py-3 text-right font-mono">{formatCurrency(totals.adjCredit)}</td>
            <td className="px-4 py-3 text-right font-mono border-l border-white/10">{formatCurrency(totals.adjBalD)}</td>
            <td className="px-4 py-3 text-right font-mono">{formatCurrency(totals.adjBalC)}</td>
            <td className="px-4 py-3 text-right font-mono border-l border-white/10 text-rose-400">{formatCurrency(totals.isD)}</td>
            <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatCurrency(totals.isC)}</td>
            <td className="px-4 py-3 text-right font-mono border-l border-white/10 text-blue-400">{formatCurrency(totals.bsD)}</td>
            <td className="px-4 py-3 text-right font-mono text-purple-400">{formatCurrency(totals.bsC)}</td>
          </tr>
          {netIncome !== 0 && (
            <tr className="bg-emerald-900/30">
              <td colSpan={2} className="px-4 py-3 text-right">LABA BERSIH (NET INCOME)</td>
              <td colSpan={6} className="px-4 py-3 border-l border-white/10"></td>
              <td className="px-4 py-3 text-right font-mono border-l border-white/10">{netIncome > 0 ? formatCurrency(netIncome) : '-'}</td>
              <td className="px-4 py-3 text-right font-mono">{netIncome < 0 ? formatCurrency(Math.abs(netIncome)) : '-'}</td>
              <td className="px-4 py-3 text-right font-mono border-l border-white/10">{netIncome < 0 ? formatCurrency(Math.abs(netIncome)) : '-'}</td>
              <td className="px-4 py-3 text-right font-mono">{netIncome > 0 ? formatCurrency(netIncome) : '-'}</td>
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  );
}

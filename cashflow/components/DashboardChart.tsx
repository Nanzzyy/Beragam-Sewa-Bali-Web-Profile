'use client';

import React, { useMemo } from 'react';
import { BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, Legend } from 'recharts';
import type { Transaction, JournalEntryWithAccount } from '../lib/supabase';

type TxWithEntries = Transaction & { journal_entries: JournalEntryWithAccount[] };

interface Props {
  transactions: TxWithEntries[];
}

export default function DashboardChart({ transactions }: Props) {
  const data = useMemo(() => {
    const monthlyData: Record<string, { month: string, Revenue: number, Expense: number }> = {};

    transactions.forEach(tx => {
      const date = new Date(tx.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthLabel, Revenue: 0, Expense: 0 };
      }

      tx.journal_entries.forEach(je => {
        if (je.category === 'Revenue' && je.credit > 0) {
          monthlyData[monthKey].Revenue += je.credit;
        }
        if (je.category === 'Expense' && je.debit > 0) {
          monthlyData[monthKey].Expense += je.debit;
        }
      });
    });

    return Object.keys(monthlyData).sort().map(k => monthlyData[k]);
  }, [transactions]);

  if (data.length === 0) return null;

  const fmt = (val: number) => `Rp${(val / 1000000).toFixed(1)}Jt`;

  return (
    <div className="glass-card p-5 overflow-hidden w-full h-[350px]">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Grafik Arus Kas (Pendapatan vs Pengeluaran)</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
          <Tooltip 
            formatter={(value: any) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)}
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', fontSize: '12px', borderRadius: '8px' }}
            itemStyle={{ color: '#f8fafc' }}
            cursor={{ fill: '#334155', opacity: 0.1 }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
          <Bar dataKey="Revenue" name="Pendapatan" barSize={30} fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Expense" name="Pengeluaran" barSize={30} fill="#f43f5e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

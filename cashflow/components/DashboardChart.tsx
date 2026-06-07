'use client';

import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, ComposedChart, Legend } from 'recharts';
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
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
          <Tooltip 
            formatter={(value: any) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)}
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', fontSize: '12px', borderRadius: '8px' }}
            itemStyle={{ color: '#f8fafc' }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
          <Area type="monotone" dataKey="Revenue" name="Pendapatan" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
          <Bar dataKey="Expense" name="Pengeluaran" barSize={20} fill="#f43f5e" radius={[4, 4, 0, 0]} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

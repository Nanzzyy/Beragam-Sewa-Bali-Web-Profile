'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { Job, JobStatus } from '../lib/supabase';
import { JOB_STATUS_CONFIG } from '../lib/supabase';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  jobs: Job[];
  onJobClick: (id: string) => void;
}

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const toDateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Month-grid calendar view: jobs rendered as chips per date cell; hover a cell
 *  to see a popover listing all active jobs on that date. */
export default function MonthCalendar({ jobs, onJobClick }: Props) {
  const [viewDate, setViewDate] = useState(new Date());
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Hover-card penundaan-tutup: popover adalah child DOM cell tapi tergambar di
  // bawahnya, jadi onMouseLeave cell butuh jeda agar mouse sempat masuk popover.
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelClose = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setHoverDate(null), 140);
  };
  useEffect(() => () => cancelClose(), []);

  const activeJobs = useMemo(() => jobs.filter(j => j.status !== 'cancelled'), [jobs]);

  const { cells, monthLabel, jobsThisMonth } = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leading = (first.getDay() + 6) % 7; // Monday-first

    const cells: { date: Date; key: string; inMonth: boolean }[] = [];
    for (let i = 0; i < leading; i++) cells.push({ date: new Date(year, month, i - leading + 1), key: `pad-l-${i}`, inMonth: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      cells.push({ date, key: dateKey(date), inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const idx = cells.length;
      cells.push({ date: new Date(year, month, daysInMonth + idx), key: `pad-r-${idx}`, inMonth: false });
    }

    const monthLabel = viewDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const last = new Date(year, month + 1, 0);
    const jobsThisMonth = activeJobs.filter(j => {
      const s = new Date(j.setup_date).getTime();
      const e = new Date(j.completion_date).getTime();
      return s <= last.getTime() && e >= first.getTime();
    });
    return { cells, monthLabel, jobsThisMonth };
  }, [viewDate, activeJobs]);

  const jobsOnDay = (date: Date) => {
    const t = toDateOnly(date).getTime();
    return activeJobs.filter(j => {
      const s = toDateOnly(new Date(j.setup_date)).getTime();
      const e = toDateOnly(new Date(j.completion_date)).getTime();
      return t >= s && t <= e;
    });
  };

  const today = new Date();
  const navigate = (dir: number) => setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + dir, 1));

  if (activeJobs.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl border p-12 text-center">
        <p className="text-slate-500 dark:text-slate-400">Belum ada jadwal job untuk ditampilkan.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition text-slate-600 dark:text-slate-400">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">{monthLabel}</span>
          <button onClick={() => navigate(1)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition text-slate-600 dark:text-slate-400">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{jobsThisMonth.length} Job di bulan ini</div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
        {WEEKDAYS.map(w => (
          <div key={w} className="text-center py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">{w}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const dayJobs = cell.inMonth ? jobsOnDay(cell.date) : [];
          const isToday = cell.inMonth && cell.date.toDateString() === today.toDateString();
          const isSunday = cell.date.getDay() === 0;
          const isLastCol = idx % 7 === 6; // popover anchor kanan biar tidak off-screen
          return (
            <div
              key={cell.key}
              className={`relative border-b border-r border-slate-100 dark:border-slate-800 min-h-[96px] p-1.5 ${cell.inMonth ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/20'} ${hoverDate === cell.key ? 'ring-2 ring-red-500 ring-inset z-20' : ''}`}
              onMouseEnter={() => { if (cell.inMonth) { cancelClose(); setHoverDate(cell.key); } }}
              onMouseLeave={scheduleClose}
            >
              <div className={`text-xs font-semibold mb-1 ${cell.inMonth ? (isToday ? 'inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white' : isSunday ? 'text-red-400' : 'text-slate-700 dark:text-slate-300') : 'text-slate-300 dark:text-slate-600'}`}>
                {cell.date.getDate()}
              </div>

              {dayJobs.slice(0, 2).map(j => {
                const cfg = JOB_STATUS_CONFIG[j.status as JobStatus];
                return (
                  <button
                    key={j.id}
                    onClick={() => onJobClick(j.id)}
                    className="block w-full text-left text-[10px] font-medium truncate px-1.5 py-0.5 rounded mb-0.5 hover:opacity-80 transition"
                    style={{ background: cfg.bg, color: cfg.color }}
                    title={j.client_name}
                  >
                    {j.client_name}
                  </button>
                );
              })}
              {dayJobs.length > 2 && (
                <div className="text-[10px] text-slate-500 dark:text-slate-400 px-1">+{dayJobs.length - 2} lainnya</div>
              )}

              {/* Hover popover */}
              {cell.inMonth && hoverDate === cell.key && dayJobs.length > 0 && (
                <div
                  onMouseEnter={cancelClose}
                  onMouseLeave={scheduleClose}
                  className={`absolute top-full mt-1 z-40 w-60 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-2 ${isLastCol ? 'right-0' : 'left-0'}`}>
                  <div className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">
                    {cell.date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {dayJobs.map(j => {
                      const cfg = JOB_STATUS_CONFIG[j.status as JobStatus];
                      return (
                        <button key={j.id} onClick={() => onJobClick(j.id)} className="w-full flex items-center gap-2 text-left p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{j.client_name}</span>
                          <span className="text-[10px] ml-auto px-1.5 py-0.5 rounded-full shrink-0" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

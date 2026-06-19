'use client';

import React, { useMemo } from 'react';
import type { Job, JobStatus } from '../lib/supabase';
import { JOB_STATUS_CONFIG } from '../lib/supabase';

interface GanttSchedulerProps {
  jobs: Job[];
  onJobClick: (id: string) => void;
}

export default function GanttScheduler({ jobs, onJobClick }: GanttSchedulerProps) {
  const activeJobs = useMemo(() =>
    jobs.filter(j => j.status !== 'cancelled').sort((a, b) => new Date(a.setup_date).getTime() - new Date(b.setup_date).getTime()),
    [jobs]
  );

  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (activeJobs.length === 0) {
      const now = new Date();
      const min = new Date(now.getFullYear(), now.getMonth(), 1);
      const max = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { minDate: min, maxDate: max, totalDays: Math.ceil((max.getTime() - min.getTime()) / 86400000) + 1 };
    }
    const dates = activeJobs.flatMap(j => [new Date(j.setup_date), new Date(j.completion_date)]);
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    min.setDate(min.getDate() - 2);
    max.setDate(max.getDate() + 2);
    const total = Math.ceil((max.getTime() - min.getTime()) / 86400000) + 1;
    return { minDate: min, maxDate: max, totalDays: Math.max(total, 7) };
  }, [activeJobs]);

  const headerDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(minDate);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [minDate, totalDays]);

  const getBarStyle = (job: Job) => {
    const startOffset = Math.max(0, (new Date(job.setup_date).getTime() - minDate.getTime()) / 86400000);
    const duration = Math.max(1, (new Date(job.completion_date).getTime() - new Date(job.setup_date).getTime()) / 86400000 + 1);
    const leftPct = (startOffset / totalDays) * 100;
    const widthPct = (duration / totalDays) * 100;
    return { left: `${leftPct}%`, width: `${widthPct}%` };
  };

  const today = new Date();
  const todayOffset = (today.getTime() - minDate.getTime()) / 86400000;
  const todayPct = (todayOffset / totalDays) * 100;
  const showTodayLine = todayPct >= 0 && todayPct <= 100;

  if (activeJobs.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl border p-12 text-center">
        <p className="text-slate-500 dark:text-slate-400">Belum ada jadwal job untuk ditampilkan.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl border overflow-hidden">
      <div className="overflow-x-auto">
        <div style={{ minWidth: `${Math.max(totalDays * 48, 600)}px` }}>
          {/* Header */}
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            <div className="w-52 shrink-0 px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">Client / Venue</div>
            <div className="flex-1 flex relative">
              {headerDates.map((d, i) => {
                const isToday = d.toDateString() === today.toDateString();
                const isSunday = d.getDay() === 0;
                return (
                  <div key={i} className={`flex-1 min-w-[48px] text-center py-2 text-[10px] border-r border-slate-200 dark:border-slate-800 ${isToday ? 'bg-red-600/10 font-bold text-red-500' : isSunday ? 'text-red-400' : 'text-slate-500'}`}>
                    <div>{d.toLocaleDateString('id-ID', { weekday: 'short' })}</div>
                    <div className="text-sm font-semibold">{d.getDate()}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rows */}
          {activeJobs.map(job => {
            const barStyle = getBarStyle(job);
            const config = JOB_STATUS_CONFIG[job.status as JobStatus];
            return (
              <div key={job.id} className="flex items-center border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                <div className="w-52 shrink-0 px-4 py-3 border-r border-slate-200 dark:border-slate-800">
                  <div className="text-sm text-slate-900 dark:text-white font-medium truncate">{job.client_name}</div>
                  <div className="text-xs text-slate-500 truncate">{job.venue}</div>
                </div>
                <div className="flex-1 relative h-12 flex items-center px-2">
                  {showTodayLine && (
                    <div className="absolute top-0 bottom-0 w-px bg-red-600/40 z-10" style={{ left: `${todayPct}%` }} />
                  )}
                  <div className="gantt-bar absolute flex items-center px-2 text-[10px] font-semibold"
                    style={{ ...barStyle, background: config.bg, color: config.color, border: `1px solid ${config.color}40` }}
                    onClick={() => onJobClick(job.id)} title={`${job.client_name} — ${config.label}`}>
                    <span className="truncate">{config.label}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

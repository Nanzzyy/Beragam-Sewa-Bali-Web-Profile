'use client';

import React, { useMemo, useState } from 'react';
import type { Job, JobStatus } from '../lib/supabase';
import { JOB_STATUS_CONFIG } from '../lib/supabase';
import DatePicker from 'react-datepicker';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface GanttSchedulerProps {
  jobs: Job[];
  onJobClick: (id: string) => void;
}

export default function GanttScheduler({ jobs, onJobClick }: GanttSchedulerProps) {
  const [viewDate, setViewDate] = useState(new Date());

  const activeJobs = useMemo(() =>
    jobs.filter(j => j.status !== 'cancelled').sort((a, b) => new Date(a.setup_date).getTime() - new Date(b.setup_date).getTime()),
    [jobs]
  );

  const { minDate, maxDate, totalDays, visibleJobs } = useMemo(() => {
    // Generate dates for the selected month
    const min = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const max = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    const total = max.getDate();

    // Filter jobs that intersect with this month
    const visible = activeJobs.filter(j => {
      const jStart = new Date(j.setup_date).getTime();
      const jEnd = new Date(j.completion_date).getTime();
      return (jStart <= max.getTime() && jEnd >= min.getTime());
    });

    return { minDate: min, maxDate: max, totalDays: total, visibleJobs: visible };
  }, [activeJobs, viewDate]);

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
    const jStart = new Date(job.setup_date).getTime();
    const jEnd = new Date(job.completion_date).getTime();
    
    // Calculate visually bounded start and end
    const visibleStart = Math.max(jStart, minDate.getTime());
    const visibleEnd = Math.min(jEnd, maxDate.getTime());
    
    const startOffset = Math.max(0, (visibleStart - minDate.getTime()) / 86400000);
    const duration = Math.max(1, (visibleEnd - visibleStart) / 86400000 + 1);
    
    const leftPct = (startOffset / totalDays) * 100;
    const widthPct = (duration / totalDays) * 100;
    
    return { 
      left: `${leftPct}%`, 
      width: `${widthPct}%`,
      isCutStart: jStart < minDate.getTime(),
      isCutEnd: jEnd > maxDate.getTime()
    };
  };

  const today = new Date();
  const todayOffset = (today.getTime() - minDate.getTime()) / 86400000;
  const todayPct = (todayOffset / totalDays) * 100;
  const showTodayLine = todayPct >= 0 && todayPct <= 100;

  const navigateMonth = (dir: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + dir, 1));
  };

  if (activeJobs.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl border p-12 text-center">
        <p className="text-slate-500 dark:text-slate-400">Belum ada jadwal job untuk ditampilkan.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl border overflow-hidden flex flex-col">
      {/* Interactive Month Picker Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigateMonth(-1)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition text-slate-600 dark:text-slate-400">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="relative">
            <DatePicker
              selected={viewDate}
              onChange={(date: Date | null) => date && setViewDate(date)}
              dateFormat="MMMM yyyy"
              showMonthYearPicker
              customInput={
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition">
                  <CalendarIcon className="w-4 h-4 text-slate-500" />
                  {viewDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </button>
              }
            />
          </div>
          <button onClick={() => navigateMonth(1)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition text-slate-600 dark:text-slate-400">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {visibleJobs.length} Job di bulan ini
        </div>
      </div>

      {visibleJobs.length === 0 ? (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400">Belum ada jadwal job di bulan ini.</div>
      ) : (
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
            {visibleJobs.map(job => {
              const { left, width, isCutStart, isCutEnd } = getBarStyle(job);
              const config = JOB_STATUS_CONFIG[job.status as JobStatus];
              return (
                <div key={job.id} className="flex items-center border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                  <div className="w-52 shrink-0 px-4 py-3 border-r border-slate-200 dark:border-slate-800">
                    <div className="text-sm text-slate-900 dark:text-white font-medium truncate">{job.client_name}</div>
                    <div className="text-xs text-slate-500 truncate">{job.venue}</div>
                  </div>
                  <div className="flex-1 relative h-12 flex items-center px-2 overflow-hidden">
                    {showTodayLine && (
                      <div className="absolute top-0 bottom-0 w-px bg-red-600/40 z-10" style={{ left: `${todayPct}%` }} />
                    )}
                    <div className={`gantt-bar absolute flex items-center px-2 text-[10px] font-semibold ${isCutStart ? 'rounded-l-none border-l-0' : ''} ${isCutEnd ? 'rounded-r-none border-r-0' : ''}`}
                      style={{ left, width, background: config.bg, color: config.color, border: `1px solid ${config.color}40`, ...(isCutStart ? { borderLeft: 'none' } : {}), ...(isCutEnd ? { borderRight: 'none' } : {}) }}
                      onClick={() => onJobClick(job.id)} title={`${job.client_name} — ${config.label}`}>
                      {isCutStart && <div className="absolute -left-1 top-0 bottom-0 w-2 bg-gradient-to-r from-transparent to-current opacity-20" />}
                      <span className="truncate relative z-10">{config.label}</span>
                      {isCutEnd && <div className="absolute -right-1 top-0 bottom-0 w-2 bg-gradient-to-l from-transparent to-current opacity-20" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

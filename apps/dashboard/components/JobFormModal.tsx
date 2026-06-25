'use client';

import React, { useState, useEffect } from 'react';
import type { Job, JobStatus } from '../lib/supabase';
import { JOB_STATUS_CONFIG } from '../lib/supabase';
import { createJob, updateJob } from '../lib/jobs';
import { X, Calendar } from 'lucide-react';
import DatePicker from 'react-datepicker';

interface JobFormModalProps {
  job: Job | null;
  onClose: () => void;
  onSaved: () => void;
}

const InputField = ({ label, required, type = 'text', value, onChange, placeholder }: {
  label: string; required?: boolean; type?: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) => (
  <div>
    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{label}{required && ' *'}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition text-sm shadow-sm" />
  </div>
);

const DatePickerField = ({ label, required, value, onChange, placeholder }: { label: string, required?: boolean, value: string, onChange: (v: string) => void, placeholder?: string }) => {
  const dateObj = value ? new Date(value) : null;
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{label}{required && ' *'}</label>
      <div className="relative">
        <DatePicker 
          selected={dateObj} 
          onChange={(date: Date | null) => onChange(date ? date.toISOString().split('T')[0] : '')}
          dateFormat="dd MMMM yyyy"
          placeholderText={placeholder || "Pilih tanggal"}
          className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition text-sm shadow-sm"
          wrapperClassName="w-full"
        />
        <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
};

const CustomSelect = ({ value, onChange, options, label, required }: { value: string, onChange: (v: string) => void, options: { value: string, label: string, color?: string, bg?: string }[], label: string, required?: boolean }) => {
  const [open, setOpen] = useState(false);
  const selectedOpt = options.find(o => o.value === value) || options[0];
  
  return (
    <div className="relative">
      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{label}{required && ' *'}</label>
      <button type="button" onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition text-sm shadow-sm">
        <span className="flex items-center gap-2">
          {selectedOpt?.color && <span className="w-2.5 h-2.5 rounded-full" style={{ background: selectedOpt.color }} />}
          {selectedOpt?.label}
        </span>
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''} text-slate-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2">
            {options.map(opt => (
              <div key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
                className="px-4 py-2.5 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-2 text-slate-800 dark:text-slate-200">
                {opt.color && <span className="w-2.5 h-2.5 rounded-full" style={{ background: opt.color }} />}
                {opt.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default function JobFormModal({ job, onClose, onSaved }: JobFormModalProps) {
  const isEdit = !!job;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [clientName, setClientName] = useState(job?.client_name || '');
  const [clientPhone, setClientPhone] = useState(job?.client_phone || '');
  const [clientEmail, setClientEmail] = useState(job?.client_email || '');
  const [description, setDescription] = useState(job?.description || '');
  const [venue, setVenue] = useState(job?.venue || '');
  const [setupDate, setSetupDate] = useState(job?.setup_date || '');
  const [jobDate, setJobDate] = useState(job?.job_date || '');
  const [completionDate, setCompletionDate] = useState(job?.completion_date || '');
  const [status, setStatus] = useState<JobStatus>(job?.status || 'draft');
  const formatCurrencyString = (num: number) => num ? 'Rp. ' + new Intl.NumberFormat('id-ID').format(num) : '';
  const [totalRentalFee, setTotalRentalFee] = useState(formatCurrencyString(job?.total_rental_fee || 0));
  const [totalVendorCost, setTotalVendorCost] = useState(formatCurrencyString(job?.total_vendor_cost || 0));
  const [paymentMethod, setPaymentMethod] = useState(job?.payment_method || '1-101');

  const handleCurrencyChange = (val: string, setter: (v: string) => void) => {
    const numeric = val.replace(/[^0-9]/g, '');
    if (!numeric) {
      setter('');
      return;
    }
    setter('Rp. ' + new Intl.NumberFormat('id-ID').format(parseInt(numeric, 10)));
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!clientName.trim() || !venue.trim() || !setupDate || !jobDate || !completionDate) {
      setError('Semua field bertanda * wajib diisi.');
      return;
    }
    if (new Date(setupDate) > new Date(jobDate)) {
      setError('Tanggal setup tidak boleh lebih besar dari tanggal event.');
      return;
    }
    if (new Date(jobDate) > new Date(completionDate)) {
      setError('Tanggal event tidak boleh lebih besar dari tanggal selesai.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        client_name: clientName.trim(),
        client_phone: clientPhone.trim() || null,
        client_email: clientEmail.trim() || null,
        description: description.trim() || null,
        venue: venue.trim(),
        setup_date: setupDate,
        job_date: jobDate,
        completion_date: completionDate,
        status,
        total_rental_fee: parseInt(totalRentalFee.replace(/[^0-9]/g, ''), 10) || 0,
        total_vendor_cost: parseInt(totalVendorCost.replace(/[^0-9]/g, ''), 10) || 0,
        payment_method: paymentMethod,
      };

      if (isEdit && job) {
        await updateJob(job.id, payload);
      } else {
        await createJob(payload);
      }
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{isEdit ? 'Edit Job' : 'Buat Job Baru'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition text-slate-500 dark:text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Client Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Nama Client" required value={clientName} onChange={setClientName} placeholder="PT Maju Bersama" />
            <InputField label="No. Telepon Client" value={clientPhone} onChange={setClientPhone} placeholder="08123456789" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Email Client (Opsional)" type="email" value={clientEmail} onChange={setClientEmail} placeholder="client@email.com" />
            <InputField label="Venue / Lokasi Event" required value={venue} onChange={setVenue} placeholder="Bali Nusa Dua Convention Center" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Deskripsi Job</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Deskripsi event, kebutuhan alat, dll."
              className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition text-sm resize-none shadow-sm" />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <DatePickerField label="Tanggal Setup" required value={setupDate} onChange={setSetupDate} />
            <DatePickerField label="Tanggal Event" required value={jobDate} onChange={setJobDate} />
            <DatePickerField label="Tanggal Selesai" required value={completionDate} onChange={setCompletionDate} />
          </div>

          {/* Financial */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField label="Total Biaya Sewa (Rp)" required type="text" value={totalRentalFee} onChange={v => handleCurrencyChange(v, setTotalRentalFee)} placeholder="Rp. 0" />
            <InputField label="Biaya Vendor (Opsional)" type="text" value={totalVendorCost} onChange={v => handleCurrencyChange(v, setTotalVendorCost)} placeholder="Rp. 0" />
            <CustomSelect 
              label="Akun Penerimaan (Cashflow)" 
              required
              value={paymentMethod} 
              onChange={setPaymentMethod}
              options={[
                { value: '1-101', label: 'Kas Besar (1-101)' },
                { value: '1-102', label: 'Bank BCA (1-102)' },
                { value: '1-103', label: 'Bank Mandiri (1-103)' },
                { value: '1-104', label: 'Kas Kecil (1-104)' },
                { value: '1-105', label: 'Piutang Usaha (1-105)' },
              ]}
            />
          </div>

          {/* Status */}
          <div className="max-w-xs">
            <CustomSelect 
              label="Status" 
              required
              value={status} 
              onChange={(v) => setStatus(v as JobStatus)}
              options={(Object.keys(JOB_STATUS_CONFIG) as JobStatus[]).map(s => ({
                value: s,
                label: JOB_STATUS_CONFIG[s].label,
                color: JOB_STATUS_CONFIG[s].color
              }))}
            />
          </div>

          {error && <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-500/10 px-4 py-2 rounded-lg">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-xl transition text-sm font-medium">Batal</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition text-sm disabled:opacity-50 shadow-md shadow-red-500/20">
              {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Buat Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

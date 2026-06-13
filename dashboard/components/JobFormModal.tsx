'use client';

import React, { useState, useEffect } from 'react';
import type { Job, JobStatus } from '../lib/supabase';
import { JOB_STATUS_CONFIG } from '../lib/supabase';
import { createJob, updateJob } from '../lib/jobs';
import { X } from 'lucide-react';

interface JobFormModalProps {
  job: Job | null;
  onClose: () => void;
  onSaved: () => void;
}

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
  const [totalRentalFee, setTotalRentalFee] = useState(job?.total_rental_fee?.toString() || '0');
  const [totalVendorCost, setTotalVendorCost] = useState(job?.total_vendor_cost?.toString() || '0');
  const [paymentMethod, setPaymentMethod] = useState(job?.payment_method || 'Cash');

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
        total_rental_fee: parseFloat(totalRentalFee) || 0,
        total_vendor_cost: parseFloat(totalVendorCost) || 0,
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

  const InputField = ({ label, required, type = 'text', value, onChange, placeholder }: {
    label: string; required?: boolean; type?: string; value: string; onChange: (v: string) => void; placeholder?: string;
  }) => (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}{required && ' *'}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition text-sm" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up"
        style={{ background: '#1e293b', borderColor: '#334155' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">{isEdit ? 'Edit Job' : 'Buat Job Baru'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Client Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Nama Client" required value={clientName} onChange={setClientName} placeholder="PT Maju Bersama" />
            <InputField label="No. Telepon Client" value={clientPhone} onChange={setClientPhone} placeholder="08123456789" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Email Client" type="email" value={clientEmail} onChange={setClientEmail} placeholder="client@email.com" />
            <InputField label="Venue / Lokasi Event" required value={venue} onChange={setVenue} placeholder="Bali Nusa Dua Convention Center" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Deskripsi Job</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Deskripsi event, kebutuhan alat, dll."
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition text-sm resize-none" />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4">
            <InputField label="Tanggal Setup" required type="date" value={setupDate} onChange={setSetupDate} />
            <InputField label="Tanggal Event" required type="date" value={jobDate} onChange={setJobDate} />
            <InputField label="Tanggal Selesai" required type="date" value={completionDate} onChange={setCompletionDate} />
          </div>

          {/* Financial */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField label="Total Biaya Sewa (Rp)" required type="number" value={totalRentalFee} onChange={setTotalRentalFee} />
            <InputField label="Total Biaya Vendor (Rp)" type="number" value={totalVendorCost} onChange={setTotalVendorCost} />
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Metode Pembayaran *</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white outline-none focus:border-emerald-500 transition text-sm">
                <option value="Cash">Cash (Tunai)</option>
                <option value="BCA Transfer">BCA Transfer</option>
                <option value="Tempo">Tempo (Piutang)</option>
              </select>
            </div>
          </div>

          {/* Status */}
          <div className="max-w-xs">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Status *</label>
            <select value={status} onChange={e => setStatus(e.target.value as JobStatus)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white outline-none focus:border-emerald-500 transition text-sm">
              {(Object.keys(JOB_STATUS_CONFIG) as JobStatus[]).map(s => (
                <option key={s} value={s}>{JOB_STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-400 text-sm bg-red-500/10 px-4 py-2 rounded-lg">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 text-slate-400 hover:text-white border border-slate-600 rounded-xl transition text-sm font-medium">Batal</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition text-sm disabled:opacity-50">
              {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Buat Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

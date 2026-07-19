"use client";
import { showConfirm } from '../lib/confirm';
import { toast } from 'react-hot-toast';

import { useState, useEffect } from 'react';
import { fetchAssetServices, addAssetService, deleteAssetService } from '../lib/accounting';
import type { AssetService } from '../lib/supabase';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';

interface Props {
  assetId: string;
  assetName: string;
  onClose: () => void;
}

const todayStr = () => new Date().toLocaleDateString('en-CA'); // yyyy-mm-dd lokal
const fmt = (num: number) => `Rp${Math.round(num).toLocaleString('id-ID')}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

export default function ServiceHistoryModal({ assetId, assetName, onClose }: Props) {
  const [services, setServices] = useState<AssetService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serviceDate, setServiceDate] = useState(todayStr());
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [technician, setTechnician] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setServices(await fetchAssetServices(assetId));
    } catch (e) {
      toast.error('Gagal memuat riwayat service: ' + (e as Error).message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [assetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !serviceDate) return;
    setSaving(true);
    try {
      await addAssetService({
        fixed_asset_id: assetId,
        service_date: serviceDate,
        description: description.trim(),
        cost: Number(cost.replace(/[^0-9]/g, '')) || 0,
        technician: technician.trim() || null,
      });
      setDescription(''); setCost(''); setTechnician(''); setServiceDate(todayStr());
      await load();
    } catch (err) {
      toast.error('Gagal menambah service: ' + (err as Error).message);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!(await showConfirm('Hapus catatan service ini?'))) return;
    try {
      await deleteAssetService(id);
      load();
    } catch (e) {
      toast.error('Gagal menghapus: ' + (e as Error).message);
    }
  };

  const inputCls = "w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Riwayat Service</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{assetName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form tambah */}
        <form onSubmit={handleSubmit} className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Tanggal *</label>
              <input type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} required className={inputCls} />
            </div>
            <div className="sm:col-span-9">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Deskripsi Service *</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} required placeholder="Contoh: Ganti oli + service rutin mesin" className={inputCls} />
            </div>
            <div className="sm:col-span-5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Biaya (Rp)</label>
              <input type="text" inputMode="numeric" value={cost ? Number(cost.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''} onChange={e => setCost(e.target.value)} placeholder="0" className={`${inputCls} text-right font-mono`} />
            </div>
            <div className="sm:col-span-5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Teknisi / Vendor</label>
              <input type="text" value={technician} onChange={e => setTechnician(e.target.value)} placeholder="Opsional" className={inputCls} />
            </div>
            <div className="sm:col-span-2 flex items-end">
              <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md text-xs font-semibold transition-colors shadow-sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-3.5 h-3.5" /> Tambah</>}
              </button>
            </div>
          </div>
        </form>

        {/* List */}
        <div className="p-5">
          {loading ? (
            <div className="flex justify-center py-8 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : services.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">Belum ada riwayat service.</p>
          ) : (
            <ul className="space-y-2">
              {services.map(s => (
                <li key={s.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{fmtDate(s.service_date)}</span>
                      {s.cost > 0 && <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-200">{fmt(s.cost)}</span>}
                    </div>
                    <p className="text-sm text-slate-800 dark:text-slate-100 mt-1 break-words">{s.description}</p>
                    {s.technician && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Teknisi: {s.technician}</p>}
                  </div>
                  <button onClick={() => handleDelete(s.id)} title="Hapus" className="shrink-0 p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

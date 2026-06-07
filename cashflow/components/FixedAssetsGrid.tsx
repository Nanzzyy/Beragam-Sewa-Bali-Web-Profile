'use client';

import { useState, useEffect } from 'react';
import { fetchFixedAssets, upsertFixedAsset, deleteFixedAsset } from '../lib/accounting';
import type { FixedAsset } from '../lib/supabase';
import { Loader2, Plus, Edit2, Trash2, Check, X } from 'lucide-react';

export default function FixedAssetsGrid() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FixedAsset>>({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchFixedAssets();
      setAssets(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleEdit = (asset: FixedAsset) => {
    setEditingId(asset.id);
    setEditForm({ ...asset });
  };

  const handleSave = async () => {
    if (!editForm.asset_code || !editForm.asset_name || !editForm.purchase_date) return;
    try {
      await upsertFixedAsset(editForm as any);
      setEditingId(null);
      load();
    } catch (e) {
      alert('Gagal menyimpan aset: ' + (e as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Hapus aktiva tetap ini?`)) return;
    try {
      await deleteFixedAsset(id);
      load();
    } catch (e) {
      alert('Gagal menghapus aset: ' + (e as Error).message);
    }
  };

  const handleAddNew = () => {
    const newId = 'NEW-' + Math.floor(Math.random() * 1000);
    setAssets([{ 
      id: newId, asset_code: '', asset_name: '', purchase_date: new Date().toISOString().split('T')[0], 
      purchase_cost: 0, useful_life: 5, salvage_value: 0, is_active: true 
    }, ...assets]);
    setEditingId(newId);
    setEditForm({ asset_code: '', asset_name: '', purchase_date: new Date().toISOString().split('T')[0], purchase_cost: 0, useful_life: 5, salvage_value: 0 });
  };

  if (loading) return (
    <div className="p-12 flex flex-col items-center justify-center text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin mb-4" />
      <p className="text-sm font-medium">Memuat Daftar Aktiva Tetap...</p>
    </div>
  );

  const inputCls = "w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm text-sm";
  const fmt = (num: number) => `Rp${Math.round(num).toLocaleString('id-ID')}`;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">Daftar Aktiva Tetap (Otomatis)</h2>
        <button onClick={handleAddNew} className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-900 rounded-lg text-xs font-semibold transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Tambah Aktiva
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300 whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200 dark:border-slate-800/60">
            <tr>
              <th className="px-4 py-3">Kode / Nama Aset</th>
              <th className="px-4 py-3">Tgl Beli</th>
              <th className="px-4 py-3 text-right">Harga Beli</th>
              <th className="px-4 py-3 text-right">Masa (Thn/Bln)</th>
              <th className="px-4 py-3 text-right">Nilai Sisa</th>
              <th className="px-4 py-3 text-right">Penyusutan/Thn</th>
              <th className="px-4 py-3 text-right">Penyusutan/Bln</th>
              <th className="px-4 py-3 text-right">Akumulasi</th>
              <th className="px-4 py-3 text-right">Nilai Buku</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[11px]">
            {assets.map((asset) => {
              const isEditing = editingId === asset.id;
              
              // Calculations
              const masaBulan = asset.useful_life * 12;
              const nilaiSusutPerTahun = asset.useful_life > 0 ? (asset.purchase_cost - asset.salvage_value) / asset.useful_life : 0;
              const nilaiSusutPerBulan = masaBulan > 0 ? (asset.purchase_cost - asset.salvage_value) / masaBulan : 0;

              const now = new Date();
              const purchaseDate = new Date(asset.purchase_date);
              const diffMonths = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth());
              const bulanBerjalan = Math.max(0, Math.min(diffMonths, masaBulan)); 

              const akumulasi = bulanBerjalan * nilaiSusutPerBulan;
              const nilaiBuku = Math.max(asset.salvage_value, asset.purchase_cost - akumulasi);

              const isHabis = bulanBerjalan >= masaBulan;
              const statusAset = isHabis ? 'HABIS MASA MANFAAT' : 'MASIH DISUSUTKAN';
              const statusDisplay = isHabis ? 'peremajaan' : 'masih layak';

              return (
                <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/50 transition-colors group">
                  <td className="px-4 py-2.5">
                    {isEditing ? (
                      <div className="space-y-1">
                        <input value={editForm.asset_code || ''} onChange={e => setEditForm({...editForm, asset_code: e.target.value})} className={inputCls} placeholder="Kode"/>
                        <input value={editForm.asset_name || ''} onChange={e => setEditForm({...editForm, asset_name: e.target.value})} className={inputCls} placeholder="Nama"/>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span className="font-mono text-slate-500 dark:text-slate-400">{asset.asset_code}</span>
                        <span className="font-bold text-slate-900 dark:text-white text-xs">{asset.asset_name}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {isEditing ? (
                      <input type="date" value={editForm.purchase_date || ''} onChange={e => setEditForm({...editForm, purchase_date: e.target.value})} className={inputCls} />
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">{purchaseDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {isEditing ? (
                      <input type="text" value={editForm.purchase_cost ? editForm.purchase_cost.toLocaleString('id-ID') : ''} onChange={e => setEditForm({...editForm, purchase_cost: Number(e.target.value.replace(/[^0-9]/g, '')) || 0})} className={`${inputCls} text-right`} />
                    ) : fmt(asset.purchase_cost)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {isEditing ? (
                      <input type="number" value={editForm.useful_life || 0} onChange={e => setEditForm({...editForm, useful_life: Number(e.target.value)})} className={`${inputCls} text-right w-16`} />
                    ) : (
                      <div className="flex flex-col">
                        <span className="font-bold">{asset.useful_life} thn</span>
                        <span className="text-slate-500">{masaBulan} bln</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {isEditing ? (
                      <input type="text" value={editForm.salvage_value ? editForm.salvage_value.toLocaleString('id-ID') : ''} onChange={e => setEditForm({...editForm, salvage_value: Number(e.target.value.replace(/[^0-9]/g, '')) || 0})} className={`${inputCls} text-right`} />
                    ) : fmt(asset.salvage_value)}
                  </td>
                  
                  <td className="px-4 py-2.5 text-right font-mono text-slate-500">{fmt(nilaiSusutPerTahun)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-500">{fmt(nilaiSusutPerBulan)}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold">{fmt(akumulasi)}</td>
                  
                  <td className={`px-4 py-2.5 text-right font-mono font-bold ${isHabis ? 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                    {fmt(nilaiBuku)}
                  </td>

                  <td className="px-4 py-2.5 text-center">
                    <div className="flex flex-col gap-1 items-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${isHabis ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                        {statusAset}
                      </span>
                      <span className="text-[10px] text-slate-400">{statusDisplay}</span>
                    </div>
                  </td>

                  <td className="px-4 py-2.5 text-right space-x-2">
                    {isEditing ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={handleSave} className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-md transition-colors" title="Simpan"><Check className="w-4 h-4" /></button>
                        <button onClick={() => { setEditingId(null); load(); }} className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 rounded-md transition-colors" title="Batal"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(asset)} className="p-1.5 text-slate-400 hover:text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:bg-blue-500/10 rounded-md transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(asset.id)} className="p-1.5 text-slate-400 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:bg-rose-500/10 rounded-md transition-colors" title="Hapus"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

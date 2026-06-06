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

  const inputCls = "w-full bg-white dark:bg-slate-900 dark:bg-slate-100 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1.5 text-slate-900 dark:text-white dark:text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm text-sm";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white dark:text-slate-900 flex items-center gap-2">Daftar Aktiva Tetap</h2>
        <button onClick={handleAddNew} className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-900 rounded-lg text-xs font-semibold transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Tambah Aktiva
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:bg-slate-100 shadow-sm">
        <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-5 py-3">Kode Aset</th>
              <th className="px-5 py-3">Nama Aset</th>
              <th className="px-5 py-3">Tgl Beli</th>
              <th className="px-5 py-3 text-right">Harga Perolehan</th>
              <th className="px-5 py-3 text-right">Umur (Thn)</th>
              <th className="px-5 py-3 text-right">Nilai Residu</th>
              <th className="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assets.map((asset) => {
              const isEditing = editingId === asset.id;
              return (
                <tr key={asset.id} className="hover:bg-slate-50 dark:bg-slate-950/50 transition-colors group">
                  <td className="px-5 py-2.5">
                    {isEditing ? (
                      <input 
                        value={editForm.asset_code || ''} 
                        onChange={e => setEditForm({...editForm, asset_code: e.target.value})}
                        className={inputCls}
                        placeholder="FA-001"
                      />
                    ) : (
                      <span className="font-mono font-medium text-slate-600 dark:text-slate-400">{asset.asset_code}</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5">
                    {isEditing ? (
                      <input 
                        value={editForm.asset_name || ''} 
                        onChange={e => setEditForm({...editForm, asset_name: e.target.value})}
                        className={inputCls}
                      />
                    ) : (
                      <span className="font-medium text-slate-900 dark:text-white dark:text-slate-900">{asset.asset_name}</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5">
                    {isEditing ? (
                      <input 
                        type="date"
                        value={editForm.purchase_date || ''} 
                        onChange={e => setEditForm({...editForm, purchase_date: e.target.value})}
                        className={inputCls}
                      />
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">{new Date(asset.purchase_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono">
                    {isEditing ? (
                      <input 
                        type="text"
                        value={editForm.purchase_cost ? editForm.purchase_cost.toLocaleString('id-ID') : ''} 
                        onChange={e => {
                          const val = Number(e.target.value.replace(/[^0-9]/g, '')) || 0;
                          setEditForm({...editForm, purchase_cost: val});
                        }}
                        className={`${inputCls} text-right`}
                      />
                    ) : `Rp. ${asset.purchase_cost.toLocaleString('id-ID')}`}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono">
                    {isEditing ? (
                      <input 
                        type="number"
                        value={editForm.useful_life || 0} 
                        onChange={e => setEditForm({...editForm, useful_life: Number(e.target.value)})}
                        className={`${inputCls} text-right w-16`}
                      />
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">{asset.useful_life}</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono">
                    {isEditing ? (
                      <input 
                        type="text"
                        value={editForm.salvage_value ? editForm.salvage_value.toLocaleString('id-ID') : ''} 
                        onChange={e => {
                          const val = Number(e.target.value.replace(/[^0-9]/g, '')) || 0;
                          setEditForm({...editForm, salvage_value: val});
                        }}
                        className={`${inputCls} text-right`}
                      />
                    ) : `Rp. ${asset.salvage_value.toLocaleString('id-ID')}`}
                  </td>
                  <td className="px-5 py-2.5 text-right space-x-2">
                    {isEditing ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={handleSave} className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors" title="Simpan">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditingId(null); load(); }} className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 rounded-md transition-colors" title="Batal">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(asset)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(asset.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Hapus">
                          <Trash2 className="w-4 h-4" />
                        </button>
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

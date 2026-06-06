'use client';

import { useState, useEffect } from 'react';
import { fetchFixedAssets, upsertFixedAsset, deleteFixedAsset } from '../lib/accounting';
import type { FixedAsset } from '../lib/supabase';

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

  if (loading) return <div>Memuat Aktiva Tetap...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Data Grid: Daftar Aktiva Tetap</h2>
        <button onClick={handleAddNew} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors">
          + Tambah Aktiva
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
        <table className="w-full text-sm text-left">
          <thead className="bg-white/10 text-gray-200">
            <tr>
              <th className="px-4 py-3">Kode Aset</th>
              <th className="px-4 py-3">Nama Aset</th>
              <th className="px-4 py-3">Tgl Beli</th>
              <th className="px-4 py-3 text-right">Harga Perolehan</th>
              <th className="px-4 py-3 text-right">Umur (Thn)</th>
              <th className="px-4 py-3 text-right">Nilai Residu</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {assets.map((asset) => {
              const isEditing = editingId === asset.id;
              return (
                <tr key={asset.id} className="hover:bg-white/5">
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <input 
                        value={editForm.asset_code || ''} 
                        onChange={e => setEditForm({...editForm, asset_code: e.target.value})}
                        className="w-full bg-black/30 border border-white/20 rounded px-2 py-1 text-white"
                        placeholder="FA-001"
                      />
                    ) : asset.asset_code}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <input 
                        value={editForm.asset_name || ''} 
                        onChange={e => setEditForm({...editForm, asset_name: e.target.value})}
                        className="w-full bg-black/30 border border-white/20 rounded px-2 py-1 text-white"
                      />
                    ) : asset.asset_name}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <input 
                        type="date"
                        value={editForm.purchase_date || ''} 
                        onChange={e => setEditForm({...editForm, purchase_date: e.target.value})}
                        className="w-full bg-black/30 border border-white/20 rounded px-2 py-1 text-white"
                      />
                    ) : asset.purchase_date}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {isEditing ? (
                      <input 
                        type="text"
                        value={editForm.purchase_cost ? editForm.purchase_cost.toLocaleString('id-ID') : ''} 
                        onChange={e => {
                          const val = Number(e.target.value.replace(/[^0-9]/g, '')) || 0;
                          setEditForm({...editForm, purchase_cost: val});
                        }}
                        className="w-full bg-black/30 border border-white/20 rounded px-2 py-1 text-white text-right"
                      />
                    ) : `Rp. ${asset.purchase_cost.toLocaleString('id-ID')}`}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {isEditing ? (
                      <input 
                        type="number"
                        value={editForm.useful_life || 0} 
                        onChange={e => setEditForm({...editForm, useful_life: Number(e.target.value)})}
                        className="w-full bg-black/30 border border-white/20 rounded px-2 py-1 text-white text-right w-16"
                      />
                    ) : asset.useful_life}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {isEditing ? (
                      <input 
                        type="text"
                        value={editForm.salvage_value ? editForm.salvage_value.toLocaleString('id-ID') : ''} 
                        onChange={e => {
                          const val = Number(e.target.value.replace(/[^0-9]/g, '')) || 0;
                          setEditForm({...editForm, salvage_value: val});
                        }}
                        className="w-full bg-black/30 border border-white/20 rounded px-2 py-1 text-white text-right"
                      />
                    ) : `Rp. ${asset.salvage_value.toLocaleString('id-ID')}`}
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    {isEditing ? (
                      <>
                        <button onClick={handleSave} className="text-emerald-400 hover:text-emerald-300 font-medium">Simpan</button>
                        <button onClick={() => { setEditingId(null); load(); }} className="text-gray-400 hover:text-gray-300 font-medium">Batal</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEdit(asset)} className="text-blue-400 hover:text-blue-300 font-medium">Edit</button>
                        <button onClick={() => handleDelete(asset.id)} className="text-rose-400 hover:text-rose-300 font-medium">Hapus</button>
                      </>
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

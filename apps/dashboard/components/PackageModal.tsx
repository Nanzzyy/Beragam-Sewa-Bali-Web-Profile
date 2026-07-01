'use client';

import React, { useState } from 'react';
import { X, Package, Plus, Trash2 } from 'lucide-react';
import { supabase, formatRupiah } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export default function PackageModal({ 
  isOpen, 
  data, 
  onClose, 
  onSaved,
  itemsList 
}: { 
  isOpen: boolean, 
  data: any, 
  onClose: () => void, 
  onSaved: () => void,
  itemsList: any[]
}) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(data);

  React.useEffect(() => {
    setFormData(data);
  }, [data]);

  if (!isOpen || !formData) return null;

  const addItemToPackage = () => {
    setFormData({ ...formData, items: [...formData.items, { item_id: '', qty: 1 }] });
  };

  const removeItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        base_price: formData.base_price ? parseFloat(formData.base_price) : null
      };

      let pkgId = formData.id;

      if (pkgId) {
        await supabase.from('packages').update(payload).eq('id', pkgId);
        // Delete old items
        await supabase.from('package_items').delete().eq('package_id', pkgId);
      } else {
        const { data: newPkg, error } = await supabase.from('packages').insert(payload).select('id').single();
        if (error) throw error;
        pkgId = newPkg.id;
      }

      // Insert new items
      if (formData.items.length > 0) {
        const itemsToInsert = formData.items
          .filter((i: any) => i.item_id && i.qty > 0)
          .map((i: any) => ({
            package_id: pkgId,
            item_id: i.item_id,
            qty: i.qty
          }));
        if (itemsToInsert.length > 0) {
          await supabase.from('package_items').insert(itemsToInsert);
        }
      }

      onSaved();
      onClose();
      toast.success('Paket berhasil disimpan!');
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-[2rem] p-8 w-full max-w-2xl relative animate-slide-up max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center shadow-inner">
            <Package className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{formData.id ? 'Edit Paket' : 'Tambah Paket Baru'}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Masukkan informasi paket dan daftar barang</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nama Paket <span className="text-red-500">*</span></label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Contoh: Paket A" 
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:border-red-500 outline-none transition-all text-sm font-medium" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Base Price (Opsional)</label>
              <input type="number" value={formData.base_price} onChange={e => setFormData({...formData, base_price: e.target.value})} placeholder="Contoh: 1500000" min="0" 
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:border-red-500 outline-none transition-all text-sm font-medium" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Deskripsi (Opsional)</label>
            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={2} placeholder="Deskripsi paket..." 
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:border-red-500 outline-none transition-all text-sm font-medium resize-none" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Daftar Barang dalam Paket</label>
              <button type="button" onClick={addItemToPackage} className="text-xs text-red-600 dark:text-red-400 font-bold hover:underline flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Tambah Barang
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.items.length === 0 && (
                <p className="text-sm text-slate-500 italic py-2">Belum ada barang di paket ini.</p>
              )}
              {formData.items.map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <select 
                    value={item.item_id} 
                    onChange={e => updateItem(index, 'item_id', e.target.value)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:border-red-500 outline-none"
                    required
                  >
                    <option value="">-- Pilih Barang --</option>
                    {itemsList.map(inv => (
                      <option key={inv.id} value={inv.id}>{inv.name}</option>
                    ))}
                  </select>
                  <input 
                    type="number" 
                    value={item.qty} 
                    onChange={e => updateItem(index, 'qty', parseInt(e.target.value) || 1)}
                    min="1"
                    placeholder="Qty"
                    className="w-20 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:border-red-500 outline-none"
                    required
                  />
                  <button type="button" onClick={() => removeItem(index)} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-6 border-t border-slate-100 dark:border-slate-800 mt-2">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold rounded-xl text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              Batal
            </button>
            <button type="submit" disabled={saving} className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5 flex items-center gap-2">
              <Plus className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

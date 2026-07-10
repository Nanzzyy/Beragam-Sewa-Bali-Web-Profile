import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Edit, Trash2 } from 'lucide-react';
import { supabase, formatRupiah } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface SupplierItemsModalProps {
  isOpen: boolean;
  supplier: { id: string; name: string } | null;
  onClose: () => void;
}

export default function SupplierItemsModal({ isOpen, supplier, onClose }: SupplierItemsModalProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Form State
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');

  const fetchSupplierItems = async () => {
    if (!supplier) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('supplier_items')
        .select('*')
        .eq('supplier_id', supplier.id)
        .order('name');
      if (error) throw error;
      setItems(data || []);
    } catch (err: any) {
      toast.error('Gagal mengambil data: ' + err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && supplier) {
      fetchSupplierItems();
    }
  }, [isOpen, supplier]);

  if (!isOpen || !supplier) return null;

  const handleOpenForm = (item: any = null) => {
    if (item) {
      setEditingItem(item);
      setName(item.name);
      setPrice(item.price.toString());
      setDescription(item.description || '');
    } else {
      setEditingItem(null);
      setName('');
      setPrice('');
      setDescription('');
    }
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const payload = {
        supplier_id: supplier.id,
        name: name.trim(),
        price: parseFloat(price) || 0,
        description: description.trim() || null
      };

      if (editingItem) {
        const { error } = await supabase
          .from('supplier_items')
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;
        toast.success('Barang supplier diperbarui');
      } else {
        const { error } = await supabase
          .from('supplier_items')
          .insert(payload);
        if (error) throw error;
        toast.success('Barang supplier ditambahkan');
      }
      setFormOpen(false);
      fetchSupplierItems();
    } catch (err: any) {
      toast.error('Gagal menyimpan: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus barang supplier ini?')) return;
    try {
      const { error } = await supabase
        .from('supplier_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Barang supplier dihapus');
      fetchSupplierItems();
    } catch (err: any) {
      toast.error('Gagal menghapus: ' + err.message);
    }
  };

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-[2rem] p-8 w-full max-w-2xl relative animate-slide-up max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Kelola Barang Supplier: {supplier.name}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Daftar item sub-sewa atau logistik dari vendor ini.</p>
        </div>

        {formOpen ? (
          <form onSubmit={handleSave} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 mb-6">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{editingItem ? 'Edit Barang' : 'Tambah Barang Baru'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Barang <span className="text-red-500">*</span></label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Contoh: Tenda Sarnafil 3x3"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Harga Pokok Sewa (Optional)</label>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Contoh: 150000"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:border-red-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Deskripsi</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Deskripsi barang..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:border-red-500 resize-none" />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">Batal</button>
              <button type="submit" className="px-5 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700">Simpan</button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
            <div className="relative w-full max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari barang..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-red-600 transition" />
            </div>
            <button onClick={() => handleOpenForm()} className="w-full sm:w-auto flex items-center gap-1.5 px-3 py-2 bg-red-700 hover:bg-red-600 text-white font-semibold rounded-xl transition text-xs shadow-md shadow-red-500/20 justify-center">
              <Plus className="w-3.5 h-3.5" /> Tambah Barang Supplier
            </button>
          </div>
        )}

        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
          {loading ? (
            <p className="text-center text-xs text-slate-500 py-4">Memuat data...</p>
          ) : filteredItems.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-4">Belum ada barang terdaftar.</p>
          ) : (
            filteredItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                <div>
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">{item.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Harga Sewa: {item.price ? formatRupiah(item.price) : 'Bebas Biaya'} 
                    {item.description && ` • ${item.description}`}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleOpenForm(item)} className="p-1.5 text-slate-400 hover:text-blue-500 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
          <button onClick={onClose} className="px-6 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { fetchAccounts, upsertAccount, deleteAccount } from '../lib/accounting';
import type { Account } from '../lib/supabase';
import { Loader2, Plus, Edit2, Trash2, Check, X, Search } from 'lucide-react';

export default function ChartOfAccountsGrid() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Account>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAccounts();
      setAccounts(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleEdit = (acc: Account) => {
    setEditingCode(acc.account_code);
    setEditForm({ ...acc });
  };

  const handleSave = async () => {
    if (!editForm.account_code || !editForm.account_name || !editForm.category || !editForm.normal_balance) return;
    try {
      await upsertAccount(editForm as Account);
      setEditingCode(null);
      load();
    } catch (e) {
      alert('Gagal menyimpan akun: ' + (e as Error).message);
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`Hapus akun ${code}? Pastikan tidak ada transaksi yang terhubung.`)) return;
    try {
      await deleteAccount(code);
      load();
    } catch (e) {
      alert('Gagal menghapus akun: ' + (e as Error).message);
    }
  };

  const handleAddNew = () => {
    const newCode = 'NEW-' + Math.floor(Math.random() * 1000);
    setAccounts([{ account_code: newCode, account_name: '', category: 'Asset', normal_balance: 'Debet', is_active: true }, ...accounts]);
    setEditingCode(newCode);
    setEditForm({ account_code: '', account_name: '', category: 'Asset', normal_balance: 'Debet', is_active: true });
  };

  if (loading) return (
    <div className="p-12 flex flex-col items-center justify-center text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin mb-4" />
      <p className="text-sm font-medium">Memuat Daftar Akun...</p>
    </div>
  );

  const inputCls = "w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm text-sm";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">Daftar Akun (Chart of Accounts)</h2>
        <button onClick={handleAddNew} className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-900 rounded-lg text-xs font-semibold transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Tambah Akun
        </button>
      </div>

      <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 shadow-sm mb-4">
        <Search className="w-4 h-4 text-slate-400 mr-2" />
        <input 
          type="text" 
          placeholder="Cari kode atau nama akun..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="bg-transparent border-none outline-none w-full text-sm text-slate-900 dark:text-white"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider border-b border-slate-200 dark:border-slate-800/60">
            <tr>
              <th className="px-5 py-3">Kode Akun</th>
              <th className="px-5 py-3">Nama Akun</th>
              <th className="px-5 py-3">Kategori</th>
              <th className="px-5 py-3">Saldo Normal</th>
              <th className="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {accounts.filter(acc => 
              acc.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              acc.account_code.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((acc) => {
              const isEditing = editingCode === acc.account_code;
              return (
                <tr key={acc.account_code} className="hover:bg-slate-50 dark:bg-slate-950/50 transition-colors group">
                  <td className="px-5 py-2.5">
                    {isEditing ? (
                      <input 
                        value={editForm.account_code || ''} 
                        onChange={e => setEditForm({...editForm, account_code: e.target.value})}
                        className={inputCls}
                        placeholder="e.g. 1-110"
                      />
                    ) : (
                      <span className="font-mono font-medium text-slate-600 dark:text-slate-400">{acc.account_code}</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5">
                    {isEditing ? (
                      <input 
                        value={editForm.account_name || ''} 
                        onChange={e => setEditForm({...editForm, account_name: e.target.value})}
                        className={inputCls}
                      />
                    ) : (
                      <span className="font-medium text-slate-900 dark:text-white">{acc.account_name}</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5">
                    {isEditing ? (
                      <select 
                        value={editForm.category} 
                        onChange={e => setEditForm({...editForm, category: e.target.value as any})}
                        className={inputCls}
                      >
                        <option value="Asset">Asset</option>
                        <option value="Liability">Liability</option>
                        <option value="Equity">Equity</option>
                        <option value="Revenue">Revenue</option>
                        <option value="Expense">Expense</option>
                      </select>
                    ) : (
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-xs font-semibold">{acc.category}</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5">
                    {isEditing ? (
                      <select 
                        value={editForm.normal_balance} 
                        onChange={e => setEditForm({...editForm, normal_balance: e.target.value as any})}
                        className={inputCls}
                      >
                        <option value="Debet">Debet</option>
                        <option value="Kredit">Kredit</option>
                      </select>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">{acc.normal_balance}</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-right space-x-2">
                    {isEditing ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={handleSave} className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-md transition-colors" title="Simpan">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditingCode(null); load(); }} className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 rounded-md transition-colors" title="Batal">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(acc)} className="p-1.5 text-slate-400 hover:text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:bg-blue-500/10 rounded-md transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(acc.account_code)} className="p-1.5 text-slate-400 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:bg-rose-500/10 rounded-md transition-colors" title="Hapus">
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

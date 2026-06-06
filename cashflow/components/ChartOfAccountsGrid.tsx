'use client';

import { useState, useEffect } from 'react';
import { fetchAccounts, upsertAccount, deleteAccount } from '../lib/accounting';
import type { Account } from '../lib/supabase';

export default function ChartOfAccountsGrid() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Account>>({});

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

  if (loading) return <div>Memuat Daftar Akun...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Data Grid: Daftar Akun (COA)</h2>
        <button onClick={handleAddNew} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors">
          + Tambah Akun
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
        <table className="w-full text-sm text-left">
          <thead className="bg-white/10 text-gray-200">
            <tr>
              <th className="px-4 py-3">Kode Akun</th>
              <th className="px-4 py-3">Nama Akun</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Saldo Normal</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {accounts.map((acc) => {
              const isEditing = editingCode === acc.account_code;
              return (
                <tr key={acc.account_code} className="hover:bg-white/5">
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <input 
                        value={editForm.account_code || ''} 
                        onChange={e => setEditForm({...editForm, account_code: e.target.value})}
                        className="w-full bg-black/30 border border-white/20 rounded px-2 py-1 text-white"
                        placeholder="e.g. 1-110"
                      />
                    ) : acc.account_code}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <input 
                        value={editForm.account_name || ''} 
                        onChange={e => setEditForm({...editForm, account_name: e.target.value})}
                        className="w-full bg-black/30 border border-white/20 rounded px-2 py-1 text-white"
                      />
                    ) : acc.account_name}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <select 
                        value={editForm.category} 
                        onChange={e => setEditForm({...editForm, category: e.target.value as any})}
                        className="w-full bg-black/80 border border-white/20 rounded px-2 py-1 text-white"
                      >
                        <option value="Asset">Asset</option>
                        <option value="Liability">Liability</option>
                        <option value="Equity">Equity</option>
                        <option value="Revenue">Revenue</option>
                        <option value="Expense">Expense</option>
                      </select>
                    ) : acc.category}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <select 
                        value={editForm.normal_balance} 
                        onChange={e => setEditForm({...editForm, normal_balance: e.target.value as any})}
                        className="w-full bg-black/80 border border-white/20 rounded px-2 py-1 text-white"
                      >
                        <option value="Debet">Debet</option>
                        <option value="Kredit">Kredit</option>
                      </select>
                    ) : acc.normal_balance}
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    {isEditing ? (
                      <>
                        <button onClick={handleSave} className="text-emerald-400 hover:text-emerald-300 font-medium">Simpan</button>
                        <button onClick={() => { setEditingCode(null); load(); }} className="text-gray-400 hover:text-gray-300 font-medium">Batal</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEdit(acc)} className="text-blue-400 hover:text-blue-300 font-medium">Edit</button>
                        <button onClick={() => handleDelete(acc.account_code)} className="text-rose-400 hover:text-rose-300 font-medium">Hapus</button>
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

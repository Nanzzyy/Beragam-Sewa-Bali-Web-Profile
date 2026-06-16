'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Job, JobItem, JobStaff, JobProof, JobStatus, AppRole } from '../lib/supabase';
import { JOB_STATUS_CONFIG, formatRupiah, formatDate } from '../lib/supabase';
import { fetchJobById, fetchJobItems, fetchJobStaff, fetchJobProofs, uploadProofPhoto, addJobProof, updateJobStatus } from '../lib/jobs';
import { X, MapPin, Calendar, Phone, Mail, Package, Users, Camera, FileText, Upload, CheckCircle2, Truck, RotateCcw } from 'lucide-react';

interface JobDetailModalProps {
  jobId: string;
  userRole: AppRole;
  currentUserId: string;
  onClose: () => void;
  onStatusChange: (id: string, status: JobStatus) => void;
}

export default function JobDetailModal({ jobId, userRole, onClose, onStatusChange }: JobDetailModalProps) {
  const [job, setJob] = useState<Job | null>(null);
  const [items, setItems] = useState<JobItem[]>([]);
  const [staff, setStaff] = useState<JobStaff[]>([]);
  const [proofs, setProofs] = useState<JobProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'items' | 'staff' | 'proofs'>('info');
  const [uploading, setUploading] = useState(false);

  // Lists of all available items and staff for the dropdowns
  const [availableItems, setAvailableItems] = useState<{ id: string; name: string }[]>([]);
  const [availableStaff, setAvailableStaff] = useState<{ id: string; email: string }[]>([]);

  const canModify = userRole === 'owner' || userRole === 'staff';

  const loadDetails = useCallback(async () => {
    setLoading(true);
    try {
      const [jobData, itemsData, staffData, proofsData] = await Promise.all([
        fetchJobById(jobId),
        fetchJobItems(jobId),
        fetchJobStaff(jobId),
        fetchJobProofs(jobId),
      ]);
      setJob(jobData);
      setItems(itemsData);
      setStaff(staffData);
      setProofs(proofsData);

      // Fetch all items and employee profiles
      const { supabase: sbClient } = await import('../lib/supabase');
      const [iRes, sRes] = await Promise.all([
        sbClient.from('items').select('id, name').order('name'),
        sbClient.from('profiles').select('id, email').order('email')
      ]);
      if (iRes.data) setAvailableItems(iRes.data);
      if (sRes.data) setAvailableStaff(sRes.data);
    } catch (e) {
      console.error('Failed to load job details:', e);
    }
    setLoading(false);
  }, [jobId]);

  useEffect(() => { loadDetails(); }, [loadDetails]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleUploadProof = async (type: 'delivery' | 'return') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !job) return;
      setUploading(true);
      try {
        const url = await uploadProofPhoto(job.id, type, file);
        const { data: { user } } = await (await import('../lib/supabase')).supabase.auth.getUser();
        await addJobProof({ job_id: job.id, type, photo_url: url, uploaded_by: user?.id || null });
        loadDetails();
      } catch (e) {
        alert((e as Error).message);
      }
      setUploading(false);
    };
    input.click();
  };

  const handleStatusQuickChange = async (newStatus: JobStatus) => {
    if (!job) return;
    try {
      await updateJobStatus(job.id, newStatus);
      onStatusChange(job.id, newStatus);
      loadDetails();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const DetailTab = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: 'info' | 'items' | 'staff' | 'proofs' }) => (
    <button onClick={() => setActiveTab(value)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === value ? 'bg-purple-600/10 text-purple-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-white dark:bg-slate-800'}`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl border p-8 text-center" >
          <p className="text-slate-500 dark:text-slate-400">Job tidak ditemukan.</p>
          <button onClick={onClose} className="mt-4 text-purple-500 text-sm">Tutup</button>
        </div>
      </div>
    );
  }

  const config = JOB_STATUS_CONFIG[job.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl border w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-slide-up"
         onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: config.bg }}>
                <FileText className="w-6 h-6" style={{ color: config.color }} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{job.client_name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">{job.venue}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="status-badge" style={{ color: config.color, background: config.bg }}>{config.label}</span>
              <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition">
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 flex gap-2 flex-wrap">
          <DetailTab icon={FileText} label="Info" value="info" />
          <DetailTab icon={Package} label={`Barang (${items.length})`} value="items" />
          <DetailTab icon={Users} label={`Kru (${staff.length})`} value="staff" />
          <DetailTab icon={Camera} label={`Bukti (${proofs.length})`} value="proofs" />
        </div>

        <div className="p-6">
          {/* INFO TAB */}
          {activeTab === 'info' && (
            <div className="space-y-6 animate-fade-in">
              {/* Contact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {job.client_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-slate-500" /> <span className="text-slate-700 dark:text-slate-300">{job.client_phone}</span>
                  </div>
                )}
                {job.client_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-slate-500" /> <span className="text-slate-700 dark:text-slate-300">{job.client_email}</span>
                  </div>
                )}
              </div>

              {job.description && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Deskripsi</h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{job.description}</p>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                  <Calendar className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                  <div className="text-xs text-slate-500">Setup</div>
                  <div className="text-sm text-slate-900 dark:text-white font-medium">{formatDate(job.setup_date)}</div>
                </div>
                <div className="bg-white dark:bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                  <Calendar className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                  <div className="text-xs text-slate-500">Event</div>
                  <div className="text-sm text-slate-900 dark:text-white font-medium">{formatDate(job.job_date)}</div>
                </div>
                <div className="bg-white dark:bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                  <Calendar className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                  <div className="text-xs text-slate-500">Selesai</div>
                  <div className="text-sm text-slate-900 dark:text-white font-medium">{formatDate(job.completion_date)}</div>
                </div>
              </div>

              {/* Financial */}
              {(userRole === 'owner' || userRole === 'accounting') && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-purple-600/10 rounded-xl p-3">
                    <div className="text-xs text-purple-500 font-medium">Pendapatan Sewa</div>
                    <div className="text-lg font-bold text-purple-500 mt-1">{formatRupiah(job.total_rental_fee)}</div>
                  </div>
                  <div className="bg-amber-500/10 rounded-xl p-3">
                    <div className="text-xs text-amber-400 font-medium">Biaya Vendor</div>
                    <div className="text-lg font-bold text-amber-400 mt-1">{formatRupiah(job.total_vendor_cost)}</div>
                  </div>
                  <div className="bg-blue-500/10 rounded-xl p-3">
                    <div className="text-xs text-blue-400 font-medium">Laba Kotor</div>
                    <div className="text-lg font-bold text-blue-400 mt-1">{formatRupiah(job.total_rental_fee - job.total_vendor_cost)}</div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-500">
                <div>
                  Pembayaran: <span className="text-slate-700 dark:text-slate-300 font-medium">{job.payment_method}</span>
                  {job.cashflow_tx_id && <span className="ml-2 text-purple-500">✓ Jurnal Tersinkron</span>}
                </div>
                
                {/* PDF Generation Buttons */}
                <div className="flex gap-2">
                  {(userRole === 'owner' || userRole === 'staff' || userRole === 'accounting') && (
                    <button onClick={() => {
                      import('../lib/pdf').then(({ generateSuratJalan }) => generateSuratJalan(job, items));
                    }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition border border-slate-200 dark:border-slate-700">
                      <FileText className="w-3.5 h-3.5" /> Surat Jalan
                    </button>
                  )}
                  {(userRole === 'owner' || userRole === 'accounting') && (
                    <button onClick={() => {
                      import('../lib/pdf').then(({ generateInvoice }) => generateInvoice(job, items));
                    }} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-500 rounded-lg transition border border-purple-600/20">
                      <FileText className="w-3.5 h-3.5" /> Invoice
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Status Changes */}
              {canModify && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  {job.status === 'draft' && (
                    <button onClick={() => handleStatusQuickChange('confirmed')} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-500/20 transition">
                      <CheckCircle2 className="w-4 h-4" /> Konfirmasi
                    </button>
                  )}
                  {job.status === 'confirmed' && (
                    <button onClick={() => handleStatusQuickChange('on_going')} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-lg text-sm font-medium hover:bg-amber-500/20 transition">
                      <Truck className="w-4 h-4" /> Mulai Event
                    </button>
                  )}
                  {job.status === 'on_going' && (
                    <button onClick={() => handleStatusQuickChange('completed')} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/10 text-purple-500 rounded-lg text-sm font-medium hover:bg-purple-600/20 transition">
                      <CheckCircle2 className="w-4 h-4" /> Selesai
                    </button>
                  )}
                  {job.status !== 'cancelled' && job.status !== 'completed' && (
                    <button onClick={() => handleStatusQuickChange('cancelled')} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/20 transition">
                      <X className="w-4 h-4" /> Batalkan
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ITEMS TAB */}
          {activeTab === 'items' && (
            <div className="space-y-4 animate-fade-in">
              {canModify && (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const target = e.target as typeof e.target & {
                    item_id: { value: string };
                    quantity: { value: string };
                  };
                  if (!target.item_id.value || !target.quantity.value) return;
                  setUploading(true);
                  try {
                    await import('../lib/jobs').then(m => m.addJobItem({
                      job_id: job.id,
                      item_id: target.item_id.value,
                      item_name_custom: null,
                      quantity: parseInt(target.quantity.value),
                      source_vendor_id: null,
                      sub_rent_cost: 0,
                      is_returned: false
                    }));
                    target.item_id.value = '';
                    target.quantity.value = '1';
                    loadDetails();
                  } catch (err) {
                    alert((err as Error).message);
                  }
                  setUploading(false);
                }} className="flex gap-2 mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <select name="item_id" required className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-purple-500 text-slate-900 dark:text-white">
                    <option value="">-- Pilih Barang --</option>
                    {availableItems.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  <input type="number" name="quantity" placeholder="Qty" min="1" defaultValue="1" required className="w-20 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-purple-500 text-slate-900 dark:text-white" />
                  <button type="submit" disabled={uploading} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50">Tambah</button>
                </form>
              )}
              <div className="space-y-3">
                {items.length === 0 ? (
                  <p className="text-center text-slate-500 py-4 text-sm">Belum ada barang yang ditambahkan.</p>
                ) : (
                  items.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-white dark:bg-white dark:bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                      <div className="flex items-center gap-3">
                        <Package className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-900 dark:text-white">{item.item_name || item.item_name_custom || '-'}</div>
                          <div className="text-xs text-slate-500">
                            Qty: {item.quantity}
                            {item.vendor_name && ` • Vendor: ${item.vendor_name}`}
                            {item.sub_rent_cost > 0 && ` • ${formatRupiah(item.sub_rent_cost)}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`text-xs font-semibold px-2.5 py-1 rounded-full ${item.is_returned ? 'text-emerald-700 bg-emerald-100 dark:text-purple-500 dark:bg-purple-600/10' : 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/10'}`}>
                          {item.is_returned ? 'Dikembalikan' : 'Di Lokasi'}
                        </div>
                        {canModify && (
                          <button onClick={async () => {
                            if (!confirm('Hapus barang ini?')) return;
                            try {
                              await import('../lib/jobs').then(m => m.removeJobItem(item.id));
                              loadDetails();
                            } catch (e) { alert((e as Error).message); }
                          }} className="text-red-500 hover:text-red-600 p-1">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STAFF TAB */}
          {activeTab === 'staff' && (
            <div className="space-y-4 animate-fade-in">
              {canModify && (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const target = e.target as typeof e.target & {
                    profile_id: { value: string };
                    role: { value: string };
                  };
                  if (!target.profile_id.value || !target.role.value.trim()) return;
                  setUploading(true);
                  try {
                    await import('../lib/jobs').then(m => m.addJobStaff({
                      job_id: job.id,
                      profile_id: target.profile_id.value,
                      role_in_job: target.role.value.trim()
                    }));
                    target.profile_id.value = '';
                    target.role.value = '';
                    loadDetails();
                  } catch (err) {
                    alert((err as Error).message);
                  }
                  setUploading(false);
                }} className="flex gap-2 mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <select name="profile_id" required className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-purple-500 text-slate-900 dark:text-white">
                    <option value="">-- Pilih Karyawan --</option>
                    {availableStaff.map(s => (
                      <option key={s.id} value={s.id}>{s.email}</option>
                    ))}
                  </select>
                  <input type="text" name="role" placeholder="Peran (ex: Supir)" required className="w-1/3 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-purple-500 text-slate-900 dark:text-white" />
                  <button type="submit" disabled={uploading} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50">Tambah</button>
                </form>
              )}
              <div className="space-y-3">
                {staff.length === 0 ? (
                  <p className="text-center text-slate-500 py-4 text-sm">Belum ada kru yang ditugaskan.</p>
                ) : (
                  staff.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-white dark:bg-white dark:bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-purple-600 dark:text-purple-400">
                          {(s.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-900 dark:text-white">{s.email || '-'}</div>
                          <div className="text-xs text-slate-500">{s.role_in_job}</div>
                        </div>
                      </div>
                      {canModify && (
                        <button onClick={async () => {
                          if (!confirm('Hapus staf ini dari tugas?')) return;
                          try {
                            await import('../lib/jobs').then(m => m.removeJobStaff(s.id));
                            loadDetails();
                          } catch (e) { alert((e as Error).message); }
                        }} className="text-red-500 hover:text-red-600 p-1">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* PROOFS TAB */}
          {activeTab === 'proofs' && (
            <div className="space-y-4 animate-fade-in">
              {canModify && (
                <div className="flex gap-3">
                  <button onClick={() => handleUploadProof('delivery')} disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-500/20 transition disabled:opacity-50">
                    <Upload className="w-4 h-4" /> Upload Bukti Kirim
                  </button>
                  <button onClick={() => handleUploadProof('return')} disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600/10 text-purple-500 rounded-xl text-sm font-medium hover:bg-purple-600/20 transition disabled:opacity-50">
                    <RotateCcw className="w-4 h-4" /> Upload Bukti Kembali
                  </button>
                </div>
              )}
              {uploading && <p className="text-sm text-amber-400">Mengunggah foto...</p>}
              {proofs.length === 0 ? (
                <p className="text-center text-slate-500 py-8 text-sm">Belum ada bukti foto.</p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {proofs.map(p => (
                    <div key={p.id} className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                      <img src={p.photo_url} alt={`Bukti ${p.type}`} className="w-full h-40 object-cover" loading="lazy" />
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                        <span className={`text-xs font-semibold uppercase ${p.type === 'delivery' ? 'text-blue-400' : 'text-purple-500'}`}>
                          {p.type === 'delivery' ? 'Pengiriman' : 'Pengembalian'}
                        </span>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{formatDate(p.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

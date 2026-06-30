import re

with open('apps/dashboard/app/page.tsx', 'r') as f:
    content = f.read()

# 1. Insert Packages Tab
packages_tab = """
            {/* === PACKAGES TAB === */}
            {tab === 'packages' && (
              <div className="animate-fade-in space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Menu Paket</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Daftar paket alat dan barang</p>
                  </div>
                  {canModify && (
                    <button onClick={() => {
                      setPackageModalData({ name: '', description: '', base_price: '', items: [] });
                      setPackageModalOpen(true);
                    }} className="flex items-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-600 text-white font-semibold rounded-xl transition text-sm shadow-md shadow-red-500/20 w-full sm:w-auto justify-center">
                      <Plus className="w-4 h-4" /> Tambah Paket
                    </button>
                  )}
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-4">
                  {packagesList.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-500 dark:text-slate-400">Belum ada paket di database.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {packagesList.map(pkg => (
                        <div key={pkg.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition group gap-3 md:gap-0">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
                              <Package className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white text-lg">{pkg.name}</div>
                              <div className="text-sm text-slate-500 mt-1">{pkg.description || '-'}</div>
                              <div className="text-xs text-slate-400 mt-1">
                                Base Price: {pkg.base_price ? formatRupiah(pkg.base_price) : '-'} • Items: {pkg.package_items?.length || 0}
                              </div>
                            </div>
                          </div>
                          {canModify && (
                            <div className="flex gap-2 w-full md:w-auto mt-3 md:mt-0 pt-3 md:pt-0 border-t md:border-0 border-slate-100 dark:border-slate-800">
                              <button onClick={() => {
                                setPackageModalData({
                                  id: pkg.id,
                                  name: pkg.name,
                                  description: pkg.description || '',
                                  base_price: pkg.base_price ? pkg.base_price.toString() : '',
                                  items: pkg.package_items || []
                                });
                                setPackageModalOpen(true);
                              }} className="flex-1 md:flex-none px-3 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                                <Edit className="w-4 h-4" /> Edit
                              </button>
                              <button onClick={async () => {
                                if (await showConfirm(`Hapus paket ${pkg.name}?`)) {
                                  try {
                                    await supabase.from('packages').delete().eq('id', pkg.id);
                                    loadData(true);
                                    toast.success('Paket berhasil dihapus');
                                  } catch (err: any) {
                                    toast.error(err.message);
                                  }
                                }
                              }} className="flex-1 md:flex-none px-3 py-2 text-sm font-medium bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                                <Trash2 className="w-4 h-4" /> Hapus
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
"""

content = content.replace("{/* === STAFF TAB === */}", packages_tab + "\n            {/* === STAFF TAB === */}")

# 2. Insert Package Modal
with open('apps/dashboard/app/page.tsx', 'w') as f:
    f.write(content)

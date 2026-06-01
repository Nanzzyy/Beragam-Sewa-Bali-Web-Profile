// ==========================================================
// 1. SUPABASE CLIENT & STATE INITIALIZATION
// ==========================================================
const SUPABASE_URL = "https://izqrlblxbajnaovelvef.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6cXJsYmx4YmFqbmFvdmVsdmVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgwNzg3MSwiZXhwIjoyMDg4MzgzODcxfQ.oaqJmBVPYGJRhOOVmWv3CSLhJALobYeOwrs-tN1DE-I";
const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Theme initialization
if (localStorage.getItem('theme') === 'light') {
  document.documentElement.classList.remove('dark');
} else {
  document.documentElement.classList.add('dark');
}

let state = {
  user: null,
  role: null,
  categories: [],
  transactions: [],
  loading: true,
  txModalOpen: false,
  catModalOpen: false,
  settingsModalOpen: false,
  txType: 'inflow', // inflow | outflow
  newCatType: 'inflow',
  txAmount: '',
  txCategoryId: '',
  txDesc: '',
  txDate: '',
  txFile: null,
  newCatName: '',
  loginEmail: '',
  loginPassword: '',
  loginError: '',
  txSaving: false,
  catSaving: false
};

// ==========================================================
// 2. MAIN STATE RENDERER (VIRTUAL UI BINDING)
// ==========================================================
function render() {
  const root = document.getElementById('root');
  
  // Apply theme classes dynamically on render
  if (localStorage.getItem('theme') === 'light') {
    document.documentElement.classList.remove('dark');
    document.body.className = 'bg-slate-50 text-slate-800 min-h-screen transition-colors duration-300';
  } else {
    document.documentElement.classList.add('dark');
    document.body.className = 'bg-[#090D16] text-slate-100 min-h-screen transition-colors duration-300';
  }
  
  if (state.loading) {
    root.innerHTML = `
      <div class="flex flex-col items-center justify-center min-h-screen">
        <div class="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="mt-4 text-xs font-semibold text-slate-400 tracking-wider">MENGHUBUNGKAN SYSTEM...</p>
      </div>
    `;
    return;
  }

  // 1. Unauthenticated Login Screen
  if (!state.user) {
    root.innerHTML = renderLoginView();
    bindLoginEvents();
    return;
  }

  // 2. Unauthorized View (If not Owner)
  if (state.role !== 'owner') {
    root.innerHTML = renderUnauthorizedView();
    bindUnauthorizedEvents();
    return;
  }

  // 3. Main Dashboard View
  root.innerHTML = renderDashboardView();
  bindDashboardEvents();
  renderCharts();
}

// ==========================================================
// 3. VIEW TEMPLATES
// ==========================================================

function renderLoginView() {
  return `
    <div class="flex flex-col items-center justify-center min-h-screen px-4">
      <div class="w-full max-w-md bg-[#0F172A] border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div class="flex flex-col items-center mb-8">
          <div class="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center font-bold text-black text-xl shadow-lg shadow-emerald-500/25 mb-4">
            B
          </div>
          <h2 class="text-xl font-bold text-white tracking-tight">Beragam Sewa Bali</h2>
          <p class="text-xs text-slate-400 mt-1 uppercase tracking-widest">Financial Ledger Access</p>
        </div>

        <form id="login-form" class="space-y-4">
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Owner</label>
            <input 
              type="email" 
              id="login-email" 
              required 
              placeholder="owner@beragamsewabali.com" 
              value="${state.loginEmail}"
              class="w-full bg-[#1E293B]/70 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
            <input 
              type="password" 
              id="login-password" 
              required 
              placeholder="••••••••" 
              value="${state.loginPassword}"
              class="w-full bg-[#1E293B]/70 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          
          ${state.loginError ? `<p class="text-xs text-rose-500 text-center font-medium">${state.loginError}</p>` : ''}
          
          <button 
            type="submit" 
            class="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] transition-all text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-emerald-600/15 mt-2"
          >
            Masuk ke Ledger
          </button>
        </form>
      </div>
    </div>
  `;
}

function renderUnauthorizedView() {
  return `
    <div class="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div class="w-full max-w-sm bg-[#0F172A] border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <svg class="w-16 h-16 text-rose-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <h2 class="text-lg font-bold text-white">Akses Ditolak</h2>
        <p class="text-xs text-slate-400 mt-2 leading-relaxed">
          Ledger Keuangan ini hanya dapat diakses oleh akun dengan peran <strong>Owner</strong>. Akun Anda saat ini terdeteksi sebagai <strong>${state.role || 'Tidak Dikenal'}</strong>.
        </p>
        <button 
          id="logout-btn" 
          class="mt-6 w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors"
        >
          Keluar (Sign Out)
        </button>
      </div>
    </div>
  `;
}

function renderDashboardView() {
  // Calculations
  const totalInflow = state.transactions
    .filter(t => t.type === 'inflow')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutflow = state.transactions
    .filter(t => t.type === 'outflow')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalInflow - totalOutflow;

  const activeCategoryList = state.categories.filter(c => c.type === state.txType);

  const savingsGoal = parseFloat(localStorage.getItem('savingsGoal')) || 50000000;
  const savingsProgress = savingsGoal > 0 ? Math.min(100, Math.max(0, (netBalance / savingsGoal) * 100)) : 0;

  return `
    <div class="min-h-screen pb-16">
      <!-- Header -->
      <header class="sticky top-0 z-30 backdrop-blur-md bg-white/85 dark:bg-[#0F172A]/85 border-b border-slate-200 dark:border-slate-800/80 px-4 py-3 flex items-center justify-between transition-colors">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-black text-lg shadow-md shadow-emerald-500/25">
            B
          </div>
          <div>
            <h1 class="text-xs font-extrabold tracking-wider text-slate-800 dark:text-white">BSB CASHFLOW</h1>
            <p class="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Owner Corporate Ledger</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <!-- Settings Button -->
          <button 
            id="settings-btn"
            class="p-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/30 rounded-lg text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition-colors"
            title="Pengaturan & Tema"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          
          <button 
            id="export-excel-btn"
            class="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all text-white font-semibold rounded-lg shadow-md text-[11px]"
          >
            <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
            Export Excel
          </button>
          
          <button 
            id="header-logout-btn" 
            class="p-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500/30 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-500 transition-colors"
            title="Sign Out"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <!-- Main Layout container -->
      <main class="max-w-md mx-auto px-4 mt-6 space-y-6 md:max-w-5xl md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
        
        <!-- Left Side -->
        <div class="space-y-6">
          <!-- Overview Card -->
          <div class="relative overflow-hidden bg-gradient-to-br from-indigo-950/65 to-slate-900/90 dark:from-[#1E293B] dark:to-[#0F172A] border border-slate-250 dark:border-slate-800 rounded-2xl p-6 shadow-xl">
            <div class="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
            <p class="text-[10px] text-slate-400 font-bold tracking-wider uppercase">Saldo Bersih (Net Balance)</p>
            <h2 class="text-3xl font-extrabold text-white mt-1.5 tracking-tight">
              Rp ${netBalance.toLocaleString('id-ID')}
            </h2>
            
            <div class="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-slate-800/80">
              <div>
                <p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Pemasukan</p>
                <p class="text-sm font-bold text-emerald-400 mt-1">
                  Rp ${totalInflow.toLocaleString('id-ID')}
                </p>
              </div>
              <div>
                <p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Pengeluaran</p>
                <p class="text-sm font-bold text-rose-500 mt-1">
                  Rp ${totalOutflow.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>

          <!-- Savings Goal Card -->
          <div class="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 transition-colors">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xs font-bold tracking-wider text-slate-700 dark:text-slate-300 uppercase">Target Tabungan</h3>
                <p class="text-[9px] text-slate-400">Progres pencapaian dana</p>
              </div>
              <span class="text-[8px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
                Goal
              </span>
            </div>
            
            <div class="space-y-2">
              <div class="flex items-end justify-between">
                <span class="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Rp ${netBalance.toLocaleString('id-ID')}
                </span>
                <span class="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  dari Rp ${savingsGoal.toLocaleString('id-ID')}
                </span>
              </div>
              
              <!-- Progress Bar -->
              <div class="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full" 
                  style="width: ${savingsProgress}%"
                ></div>
              </div>
              
              <div class="flex justify-between items-center text-[10px] font-bold">
                <span class="text-emerald-600 dark:text-emerald-400">${savingsProgress.toFixed(1)}% Tercapai</span>
                <span class="text-slate-400">${savingsProgress >= 100 ? '🎉 Target Tercapai!' : 'Semangat Menabung!'}</span>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="grid grid-cols-2 gap-3">
            <button 
              id="action-inflow-btn"
              class="flex items-center justify-center gap-1.5 py-3.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-50/10 dark:hover:bg-slate-800 rounded-xl transition-all font-bold text-[10px] tracking-wider uppercase text-emerald-600 dark:text-emerald-400"
            >
              + PEMASUKAN
            </button>
            <button 
              id="action-outflow-btn"
              class="flex items-center justify-center gap-1.5 py-3.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 hover:border-rose-500/50 hover:bg-rose-50/10 dark:hover:bg-slate-800 rounded-xl transition-all font-bold text-[10px] tracking-wider uppercase text-rose-600 dark:text-rose-400"
            >
              - PENGELUARAN
            </button>
          </div>

          <!-- Line Chart Trends -->
          <div class="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg transition-colors">
            <h3 class="text-xs font-bold tracking-wider text-slate-700 dark:text-slate-300 uppercase mb-4">Tren Transaksi Bulanan</h3>
            <div class="w-full h-48 relative">
              <canvas id="trendsChart"></canvas>
            </div>
          </div>
        </div>

        <!-- Right Side -->
        <div class="space-y-6">
          <!-- Allocation Expense Breakdown -->
          <div class="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg transition-colors">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xs font-bold tracking-wider text-slate-700 dark:text-slate-300 uppercase">Alokasi Pengeluaran</h3>
              <button 
                id="manage-cats-btn" 
                class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline tracking-wider uppercase"
              >
                Kelola Kategori
              </button>
            </div>
            <div class="w-full h-44 relative flex items-center justify-center">
              <canvas id="expensesChart" class="max-h-full"></canvas>
            </div>
          </div>

          <!-- Ledger Table -->
          <div class="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg transition-colors">
            <h3 class="text-xs font-bold tracking-wider text-slate-700 dark:text-slate-300 uppercase mb-4">Daftar Transaksi (Ledger)</h3>
            <div class="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              ${state.transactions.length === 0 ? `
                <div class="text-center py-12 text-xs text-slate-400">
                  Belum ada transaksi terdaftar.
                </div>
              ` : state.transactions.map(tx => `
                <div class="flex items-center justify-between gap-4 p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl transition-colors">
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                        tx.type === 'inflow' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }">
                        ${tx.category_name}
                      </span>
                      <span class="text-[9px] text-slate-400 dark:text-slate-500">
                        ${new Date(tx.transaction_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <p class="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1.5 truncate">${tx.description || '-'}</p>
                  </div>
                  <div class="text-right shrink-0 flex items-center gap-3">
                    <div>
                      <p class="text-xs font-extrabold ${tx.type === 'inflow' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-500'}">
                        ${tx.type === 'inflow' ? '+' : '-'} Rp ${tx.amount.toLocaleString('id-ID')}
                      </p>
                      ${tx.receipt_url ? `
                        <a href="${tx.receipt_url}" target="_blank" class="text-[9px] text-emerald-600 dark:text-emerald-400 hover:underline block mt-0.5 font-medium">Lihat Bukti</a>
                      ` : ''}
                    </div>
                    <button 
                      data-id="${tx.id}"
                      class="delete-tx-btn text-slate-400 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-500 p-1 transition-colors animate-pulse"
                      title="Hapus Transaksi"
                    >
                      <svg class="w-3.5 h-3.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

      </main>

      <!-- Settings Modal -->
      ${state.settingsModalOpen ? `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div class="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl transition-colors">
            <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800/80">
              <h3 class="font-bold text-slate-800 dark:text-white text-base">Pengaturan Ledger</h3>
              <button id="close-settings-modal" class="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            
            <div class="mt-4 space-y-5">
              <!-- Mode Tampilan -->
              <div>
                <label class="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tema Aplikasi</label>
                <div class="grid grid-cols-2 gap-2">
                  <button 
                    type="button" 
                    id="theme-light-btn"
                    class="py-2.5 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                      localStorage.getItem('theme') === 'light' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700'
                    }"
                  >
                    ☀️ Light Mode
                  </button>
                  <button 
                    type="button" 
                    id="theme-dark-btn"
                    class="py-2.5 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                      localStorage.getItem('theme') !== 'light' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-350'
                    }"
                  >
                    🌙 Dark Mode
                  </button>
                </div>
              </div>

              <!-- Edit Goal -->
              <div>
                <label class="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Target Tabungan (IDR)</label>
                <input 
                  type="text" 
                  id="settings-savings-goal"
                  value="${(parseFloat(localStorage.getItem('savingsGoal')) || 50000000).toLocaleString('id-ID')}"
                  class="w-full bg-slate-50 dark:bg-[#1E293B]/70 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <!-- Financial Health Status -->
              <div class="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-1">
                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Kesehatan Finansial</p>
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Rasio Pengeluaran:</span>
                  <span class="text-xs font-bold ${
                    totalInflow === 0 ? 'text-slate-400' : (totalOutflow / totalInflow > 0.7 ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400')
                  }">
                    ${totalInflow === 0 ? 'N/A' : ((totalOutflow / totalInflow) * 100).toFixed(1) + '%'}
                  </span>
                </div>
                <div class="text-[10px] text-slate-500 dark:text-slate-400 leading-normal mt-1">
                  ${
                    totalInflow === 0 ? 'Belum ada data pemasukan.' : (
                      (totalOutflow / totalInflow) > 0.7 
                      ? '⚠️ Pengeluaran Anda melebihi 70% pemasukan. Sangat disarankan untuk membatasi pengeluaran non-esensial.' 
                      : '✅ Kondisi kas sehat! Rasio pengeluaran di bawah batas aman 70%.'
                    )
                  }
                </div>
              </div>

              <button 
                id="save-settings-btn"
                class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg text-xs transition-all mt-2"
              >
                Terapkan & Simpan
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Transaction Modal -->
      ${state.txModalOpen ? `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div class="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl transition-colors">
            <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800/80">
              <h3 class="font-bold text-slate-850 dark:text-white text-base">Tambah ${state.txType === 'inflow' ? 'Pemasukan' : 'Pengeluaran'}</h3>
              <button id="close-tx-modal" class="text-slate-400 hover:text-slate-250">✕</button>
            </div>
            <form id="tx-form" class="mt-4 space-y-4">
              <div>
                <label class="block text-[9px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1">Jumlah (IDR)</label>
                <input 
                  type="text" 
                  id="tx-amount"
                  required 
                  placeholder="Rp 0" 
                  value="${state.txAmount ? 'Rp ' + parseFloat(state.txAmount).toLocaleString('id-ID') : ''}"
                  class="w-full bg-slate-50 dark:bg-[#1E293B]/70 border border-slate-250 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-850 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label class="block text-[9px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1">Kategori</label>
                <select 
                  id="tx-category"
                  required
                  class="w-full bg-slate-50 dark:bg-[#1E293B]/70 border border-slate-250 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  ${activeCategoryList.map(c => `
                    <option value="${c.id}" ${state.txCategoryId === c.id ? 'selected' : ''}>${c.name}</option>
                  `).join('')}
                </select>
              </div>

              <div>
                <label class="block text-[9px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1">Tanggal Transaksi</label>
                <input 
                  type="datetime-local" 
                  id="tx-date"
                  value="${state.txDate}"
                  class="w-full bg-slate-50 dark:bg-[#1E293B]/70 border border-slate-250 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label class="block text-[9px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-1">Deskripsi / Catatan</label>
                <textarea 
                  id="tx-desc"
                  placeholder="Keterangan transaksi..." 
                  class="w-full bg-slate-50 dark:bg-[#1E293B]/70 border border-slate-250 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 h-16 resize-none"
                >${state.txDesc}</textarea>
              </div>

              <div>
                <label class="block text-[9px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-1">Upload Bukti Transfer / Kuitansi</label>
                <input 
                  type="file" 
                  id="tx-file"
                  accept="image/*"
                  class="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-200 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-300 hover:file:bg-slate-300 dark:hover:file:bg-slate-700"
                />
              </div>

              <div class="pt-2">
                <button 
                  type="submit" 
                  id="save-tx-btn"
                  ${state.txSaving ? 'disabled' : ''}
                  class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-white font-bold py-2.5 rounded-lg text-sm transition-all"
                >
                  ${state.txSaving ? 'Menyimpan...' : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ` : ''}

      <!-- Categories Modal -->
      ${state.catModalOpen ? `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div class="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl transition-colors">
            <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800/80">
              <h3 class="font-bold text-slate-850 dark:text-white text-base">Kelola Kategori Ledger</h3>
              <button id="close-cat-modal" class="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            
            <div class="mt-4 max-h-36 overflow-y-auto space-y-2 pr-1" id="cat-list-container">
              ${state.categories.map(c => `
                <div class="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors">
                  <span class="text-xs text-slate-700 dark:text-slate-200 font-medium">${c.name}</span>
                  <span class="text-[8px] font-bold uppercase ${c.type === 'inflow' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-500'}">
                    ${c.type === 'inflow' ? 'Inflow' : 'Outflow'}
                  </span>
                </div>
              `).join('')}
            </div>

            <form id="cat-form" class="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-4">
              <p class="text-[10px] font-bold text-slate-800 dark:text-white uppercase tracking-wider">Tambah Kategori Baru</p>
              <div>
                <label class="block text-[9px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1">Nama Kategori</label>
                <input 
                  type="text" 
                  id="cat-name"
                  required 
                  placeholder="Contoh: Penjualan Aset, Maintenance" 
                  value="${state.newCatName}"
                  class="w-full bg-slate-50 dark:bg-[#1E293B]/70 border border-slate-250 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label class="block text-[9px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1">Jenis</label>
                <div class="grid grid-cols-2 gap-2">
                  <button 
                    type="button" 
                    id="cat-type-inflow"
                    class="py-2 text-xs font-bold rounded-lg border ${
                      state.newCatType === 'inflow' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'
                    }"
                  >
                    Pemasukan
                  </button>
                  <button 
                    type="button" 
                    id="cat-type-outflow"
                    class="py-2 text-xs font-bold rounded-lg border ${
                      state.newCatType === 'outflow' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-450 border-rose-500/40' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'
                    }"
                  >
                    Pengeluaran
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                id="save-cat-btn"
                ${state.catSaving ? 'disabled' : ''}
                class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-white font-bold py-2 rounded-lg text-xs transition-all"
              >
                ${state.catSaving ? 'Menyimpan...' : 'Buat Kategori'}
              </button>
            </form>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ==========================================================
// 4. EVENT BINDING & INTERACTION LOGIC
// ==========================================================

function bindLoginEvents() {
  const form = document.getElementById('login-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    state.loading = true;
    render();
    
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      state.user = data.user;
      await fetchUserProfile(data.user.id);
    } catch (err) {
      state.loginError = err.message;
      state.loading = false;
      render();
    }
  });
}

function bindUnauthorizedEvents() {
  const btn = document.getElementById('logout-btn');
  if (btn) {
    btn.addEventListener('click', handleLogout);
  }
}

async function handleLogout() {
  state.loading = true;
  render();
  await supabaseClient.auth.signOut();
  state.user = null;
  state.role = null;
  state.categories = [];
  state.transactions = [];
  state.loading = false;
  render();
}

function bindDashboardEvents() {
  // Logout buttons
  const logoutBtn = document.getElementById('header-logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  // Settings Button
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      state.settingsModalOpen = true;
      render();
    });
  }

  // Edit Goal Button
  const editGoalBtn = document.getElementById('edit-goal-btn');
  if (editGoalBtn) {
    editGoalBtn.addEventListener('click', () => {
      state.settingsModalOpen = true;
      render();
    });
  }

  // Settings Modal Closures
  const closeSettings = document.getElementById('close-settings-modal');
  if (closeSettings) {
    closeSettings.addEventListener('click', () => {
      state.settingsModalOpen = false;
      render();
    });
  }

  // Settings Modal Theme Toggles
  const themeLightBtn = document.getElementById('theme-light-btn');
  const themeDarkBtn = document.getElementById('theme-dark-btn');
  if (themeLightBtn) {
    themeLightBtn.addEventListener('click', () => {
      localStorage.setItem('theme', 'light');
      render();
    });
  }
  if (themeDarkBtn) {
    themeDarkBtn.addEventListener('click', () => {
      localStorage.setItem('theme', 'dark');
      render();
    });
  }

  // Settings Modal Input Formatting
  const settingsGoalInput = document.getElementById('settings-savings-goal');
  if (settingsGoalInput) {
    settingsGoalInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '');
      let num = parseFloat(val);
      e.target.value = isNaN(num) ? '' : num.toLocaleString('id-ID');
    });
  }

  // Save Settings Modal
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      const goalInput = document.getElementById('settings-savings-goal');
      if (goalInput) {
        const rawGoal = parseFloat(goalInput.value.replace(/\D/g, ''));
        if (!isNaN(rawGoal) && rawGoal >= 0) {
          localStorage.setItem('savingsGoal', rawGoal);
        }
      }
      state.settingsModalOpen = false;
      render();
    });
  }

  // Quick Action Forms
  const inflowBtn = document.getElementById('action-inflow-btn');
  if (inflowBtn) inflowBtn.addEventListener('click', () => {
    state.txType = 'inflow';
    state.txAmount = '';
    state.txDesc = '';
    state.txDate = new Date().toISOString().slice(0, 16);
    state.txModalOpen = true;
    render();
  });

  const outflowBtn = document.getElementById('action-action-btn') || document.getElementById('action-outflow-btn');
  if (outflowBtn) outflowBtn.addEventListener('click', () => {
    state.txType = 'outflow';
    state.txAmount = '';
    state.txDesc = '';
    state.txDate = new Date().toISOString().slice(0, 16);
    state.txModalOpen = true;
    render();
  });

  // Export Excel
  const excelBtn = document.getElementById('export-excel-btn');
  if (excelBtn) excelBtn.addEventListener('click', exportToExcel);

  // Manage Categories modal trigger
  const manageCatsBtn = document.getElementById('manage-cats-btn');
  if (manageCatsBtn) manageCatsBtn.addEventListener('click', () => {
    state.catModalOpen = true;
    state.newCatName = '';
    render();
  });

  // Modal Closures
  const closeTx = document.getElementById('close-tx-modal');
  if (closeTx) closeTx.addEventListener('click', () => {
    state.txModalOpen = false;
    render();
  });

  const closeCat = document.getElementById('close-cat-modal');
  if (closeCat) closeCat.addEventListener('click', () => {
    state.catModalOpen = false;
    render();
  });

  // Nominal Input Formatting
  const txAmountInput = document.getElementById('tx-amount');
  if (txAmountInput) {
    txAmountInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '');
      state.txAmount = val;
      let num = parseFloat(val);
      e.target.value = isNaN(num) ? '' : 'Rp ' + num.toLocaleString('id-ID');
    });
  }

  // Form Submission: Add Transaction
  const txForm = document.getElementById('tx-form');
  if (txForm) {
    txForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = parseFloat(state.txAmount);
      const categoryId = document.getElementById('tx-category').value;
      const dateVal = document.getElementById('tx-date').value;
      const description = document.getElementById('tx-desc').value;
      const fileInput = document.getElementById('tx-file');
      
      if (!amount || !categoryId) return;
      
      state.txSaving = true;
      document.getElementById('save-tx-btn').disabled = true;
      document.getElementById('save-tx-btn').innerText = "Menyimpan...";

      let receiptUrl = '';
      if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${state.user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('receipts')
          .upload(fileName, file);

        if (!uploadError) {
          const { data: publicUrlData } = supabaseClient.storage
            .from('receipts')
            .getPublicUrl(fileName);
          receiptUrl = publicUrlData.publicUrl;
        }
      }

      try {
        const { error } = await supabaseClient.from('transactions').insert({
          owner_id: state.user.id,
          amount: amount,
          type: state.txType,
          category_id: categoryId,
          description: description,
          receipt_url: receiptUrl || null,
          transaction_date: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString()
        });

        if (error) throw error;
        state.txModalOpen = false;
        await fetchTransactions();
      } catch (err) {
        alert("Gagal menyimpan transaksi: " + err.message);
      } finally {
        state.txSaving = false;
        render();
      }
    });
  }

  // Form Submission: Add Category
  const catForm = document.getElementById('cat-form');
  if (catForm) {
    // Buttons for Inflow/Outflow toggle in form
    const catInflowBtn = document.getElementById('cat-type-inflow');
    const catOutflowBtn = document.getElementById('cat-type-outflow');
    if (catInflowBtn) catInflowBtn.addEventListener('click', () => { state.newCatType = 'inflow'; render(); });
    if (catOutflowBtn) catOutflowBtn.addEventListener('click', () => { state.newCatType = 'outflow'; render(); });

    catForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('cat-name').value.trim();
      if (!name) return;

      state.catSaving = true;
      document.getElementById('save-cat-btn').disabled = true;
      
      try {
        const { error } = await supabaseClient.from('categories').insert({
          owner_id: state.user.id,
          name: name,
          type: state.newCatType
        });
        if (error) throw error;
        state.newCatName = '';
        await fetchCategories();
      } catch (err) {
        alert("Gagal menambahkan kategori: " + err.message);
      } finally {
        state.catSaving = false;
        render();
      }
    });
  }

  // Delete Transaction Buttons
  const deleteBtns = document.querySelectorAll('.delete-tx-btn');
  deleteBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      if (!id) return;
      if (confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) {
        state.loading = true;
        render();
        try {
          const { error } = await supabaseClient.from('transactions').delete().eq('id', id);
          if (error) throw error;
          await fetchTransactions();
        } catch (err) {
          alert("Gagal menghapus transaksi: " + err.message);
          state.loading = false;
          render();
        }
      }
    });
  });
}

// ==========================================================
// 5. DATA INGESTION (SUPABASE CALLS)
// ==========================================================

async function fetchUserProfile(userId) {
  try {
    // Read from public profiles table configured on checkup
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) throw error;
    state.role = data ? data.role : 'staff';
    
    if (state.role === 'owner') {
      await Promise.all([fetchCategories(), fetchTransactions()]);
    }
  } catch (err) {
    state.role = 'staff'; // Fallback to safe restriction
  } finally {
    state.loading = false;
    render();
  }
}

async function fetchCategories() {
  const { data, error } = await supabaseClient
    .from('categories')
    .select('*')
    .order('name');
  if (!error && data) {
    state.categories = data;
  }
}

async function fetchTransactions() {
  const { data, error } = await supabaseClient
    .from('transactions')
    .select(`
      id,
      amount,
      type,
      category_id,
      description,
      receipt_url,
      transaction_date,
      categories(name)
    `)
    .order('transaction_date', { ascending: false });
  
  if (!error && data) {
    state.transactions = data.map(t => ({
      id: t.id,
      amount: parseFloat(t.amount),
      type: t.type,
      category_id: t.category_id,
      category_name: t.categories ? t.categories.name : 'Lainnya',
      description: t.description,
      receipt_url: t.receipt_url,
      transaction_date: t.transaction_date
    }));
  }
}

// ==========================================================
// 6. CHARTS INITIALIZATION (CHART.JS)
// ==========================================================
let trendsChartInstance = null;
let expensesChartInstance = null;

function renderCharts() {
  // Chart 1: Trend Inflow vs Outflow
  const trendsCtx = document.getElementById('trendsChart');
  if (trendsCtx) {
    if (trendsChartInstance) trendsChartInstance.destroy();
    
    // Aggregate transactions by date
    const monthlyData = {};
    const last5Months = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const name = d.toLocaleString('id-ID', { month: 'short' });
      last5Months.push(name);
      monthlyData[name] = { inflow: 0, outflow: 0 };
    }

    state.transactions.forEach(t => {
      const name = new Date(t.transaction_date).toLocaleString('id-ID', { month: 'short' });
      if (monthlyData[name]) {
        if (t.type === 'inflow') monthlyData[name].inflow += t.amount;
        else monthlyData[name].outflow += t.amount;
      }
    });

    trendsChartInstance = new Chart(trendsCtx, {
      type: 'line',
      data: {
        labels: last5Months,
        datasets: [
          {
            label: 'Inflow',
            data: last5Months.map(m => monthlyData[m].inflow),
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.3
          },
          {
            label: 'Outflow',
            data: last5Months.map(m => monthlyData[m].outflow),
            borderColor: '#EF4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748B', font: { size: 9 } } },
          y: { grid: { color: '#1E293B' }, ticks: { color: '#64748B', font: { size: 9 } } }
        }
      }
    });
  }

  // Chart 2: Expenses Pie Breakdown
  const expensesCtx = document.getElementById('expensesChart');
  if (expensesCtx) {
    if (expensesChartInstance) expensesChartInstance.destroy();

    const categorySum = {};
    state.transactions.filter(t => t.type === 'outflow').forEach(t => {
      categorySum[t.category_name] = (categorySum[t.category_name] || 0) + t.amount;
    });

    let labels = Object.keys(categorySum);
    let dataValues = Object.values(categorySum);
    let chartColors = COLORS;

    if (labels.length === 0) {
      labels = ['Belum Ada Pengeluaran'];
      dataValues = [1];
      chartColors = ['rgba(71, 85, 105, 0.3)'];
    }

    expensesChartInstance = new Chart(expensesCtx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: dataValues,
          backgroundColor: chartColors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#94A3B8', font: { size: 9 } }
          }
        }
      }
    });
  }
}

// ==========================================================
// 7. EXCEL EXPORT MODULE (EXCELJS)
// ==========================================================
async function exportToExcel() {
  if (state.transactions.length === 0) {
    alert("Tidak ada transaksi untuk diekspor!");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Cashflow Ledger', {
    views: [{ showGridLines: true }]
  });

  worksheet.columns = [
    { header: 'No', key: 'no', width: 8 },
    { header: 'Tanggal', key: 'date', width: 22 },
    { header: 'Jenis', key: 'type', width: 14 },
    { header: 'Kategori', key: 'category', width: 22 },
    { header: 'Jumlah (IDR)', key: 'amount', width: 20 },
    { header: 'Deskripsi / Catatan', key: 'description', width: 35 }
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E3A8A' }
    };
    cell.font = {
      name: 'Segoe UI',
      bold: true,
      color: { argb: 'FFFFFF' },
      size: 11
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center'
    };
    cell.border = {
      top: { style: 'medium', color: { argb: '000000' } },
      bottom: { style: 'medium', color: { argb: '000000' } },
      left: { style: 'thin', color: { argb: 'D3D3D3' } },
      right: { style: 'thin', color: { argb: 'D3D3D3' } }
    };
  });

  state.transactions.forEach((tx, idx) => {
    const row = worksheet.addRow({
      no: idx + 1,
      date: new Date(tx.transaction_date).toLocaleString('id-ID'),
      type: tx.type === 'inflow' ? 'Pemasukan (Inflow)' : 'Pengeluaran (Outflow)',
      category: tx.category_name,
      amount: Number(tx.amount),
      description: tx.description || '-'
    });

    row.height = 22;

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Segoe UI', size: 10 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        left: { style: 'thin', color: { argb: 'E2E8F0' } },
        right: { style: 'thin', color: { argb: 'E2E8F0' } }
      };
      
      if (colNumber === 1 || colNumber === 3) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colNumber === 5) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFormat = 'Rp" "#,##0';
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });
  });

  const summaryRowIndex = state.transactions.length + 2;

  const totalLabelRow = worksheet.getRow(summaryRowIndex);
  totalLabelRow.getCell(4).value = 'Total Pemasukan:';
  totalLabelRow.getCell(4).font = { name: 'Segoe UI', bold: true };
  totalLabelRow.getCell(5).value = {
    formula: `SUMIF(C2:C${summaryRowIndex - 1}, "Pemasukan (Inflow)", E2:E${summaryRowIndex - 1})`,
    date1904: false
  };
  totalLabelRow.getCell(5).font = { name: 'Segoe UI', bold: true };
  totalLabelRow.getCell(5).numFormat = 'Rp" "#,##0';

  const outflowLabelRow = worksheet.getRow(summaryRowIndex + 1);
  outflowLabelRow.getCell(4).value = 'Total Pengeluaran:';
  outflowLabelRow.getCell(4).font = { name: 'Segoe UI', bold: true };
  outflowLabelRow.getCell(5).value = {
    formula: `SUMIF(C2:C${summaryRowIndex - 1}, "Pengeluaran (Outflow)", E2:E${summaryRowIndex - 1})`,
    date1904: false
  };
  outflowLabelRow.getCell(5).font = { name: 'Segoe UI', bold: true };
  outflowLabelRow.getCell(5).numFormat = 'Rp" "#,##0';

  const netLabelRow = worksheet.getRow(summaryRowIndex + 2);
  netLabelRow.getCell(4).value = 'Saldo Bersih (Net):';
  netLabelRow.getCell(4).font = { name: 'Segoe UI', bold: true, color: { argb: '1E3A8A' } };
  netLabelRow.getCell(5).value = {
    formula: `E${summaryRowIndex} - E${summaryRowIndex + 1}`,
    date1904: false
  };
  netLabelRow.getCell(5).font = { name: 'Segoe UI', bold: true, color: { argb: '1E3A8A' } };
  netLabelRow.getCell(5).numFormat = 'Rp" "#,##0';

  netLabelRow.getCell(4).border = { bottom: { style: 'double', color: { argb: '1E3A8A' } } };
  netLabelRow.getCell(5).border = { bottom: { style: 'double', color: { argb: '1E3A8A' } } };

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `BSB_Cashflow_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ==========================================================
// 8. LIFE CYCLE: AUTH LISTENERS & BOOTSTRAP
// ==========================================================

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service worker registered!'))
      .catch(err => console.log('Service worker registration failed:', err));
  });
}

// Check initial session explicitly on startup
async function initAuth() {
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    if (session) {
      state.user = session.user;
      await fetchUserProfile(session.user.id);
    } else {
      state.user = null;
      state.role = null;
      state.loading = false;
      render();
    }
  } catch (err) {
    console.error("Auth init error:", err);
    state.user = null;
    state.role = null;
    state.loading = false;
    render();
  }

  // Subscribe to subsequent auth changes
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      if (!state.user || state.user.id !== session.user.id) {
        state.user = session.user;
        state.loading = true;
        render();
        await fetchUserProfile(session.user.id);
      }
    } else {
      state.user = null;
      state.role = null;
      state.loading = false;
      render();
    }
  });
}

initAuth();

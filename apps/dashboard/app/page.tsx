'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase, type Job, type JobStatus, type AppRole, JOB_STATUS_CONFIG, formatRupiah, formatDate } from '../lib/supabase';
import { fetchJobs, fetchDashboardStats, createJob, updateJob, updateJobStatus, deleteJob, type DashboardStats } from '../lib/jobs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';

const JobDetailModal = dynamic(() => import('../components/JobDetailModal'), { ssr: false });
const JobFormModal = dynamic(() => import('../components/JobFormModal'), { ssr: false });
const PackageModal = dynamic(() => import('../components/PackageModal'), { ssr: false });
const GanttScheduler = dynamic(() => import('../components/GanttScheduler'), { ssr: false });
const SupplierItemsModal = dynamic(() => import('../components/SupplierItemsModal'), { ssr: false });
const MonthCalendar = dynamic(() => import('../components/MonthCalendar'), { ssr: false });
import PDFTemplateEditor from '../components/PDFTemplateEditor';
import { defaultTemplate, type PDFTemplateLayout } from '../lib/pdf-template';
import { downloadCatalogTemplate, importPackages } from '../lib/excel';
import { LayoutDashboard, Briefcase, Plus, Search, Trash2, LogOut, Moon, Sun, CalendarDays, TrendingUp, DollarSign, Users, Filter, Edit, Eye, ChevronRight, Activity, AlertCircle, Package, Layers, X, Globe, Wallet, Truck, Image, ExternalLink, Lock, Copy, FileSpreadsheet, Menu, CheckCircle2, PanelLeftClose, PanelLeftOpen, ChartPie, History, Wrench, ShoppingCart, Calendar, Boxes, ClipboardList } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { useTheme } from 'next-themes';
import { toast } from 'react-hot-toast';
import { showConfirm } from '../lib/confirm';
import { showPrompt } from '../lib/prompt';

// Sparepart Purchase History sub-component
function SparepartPurchaseHistory({ sparepartId, canModify, onUpdate }: { sparepartId: string; canModify: boolean; onUpdate: () => void }) {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('sparepart_purchases')
      .select('*')
      .eq('sparepart_id', sparepartId)
      .order('purchase_date', { ascending: false })
      .then(({ data }) => {
        setPurchases(data || []);
        setLoading(false);
      });
  }, [sparepartId]);

  const handleDelete = async (purchase: any) => {
    if (!(await showConfirm('Hapus riwayat pembelian ini? Stok akan dikurangi.'))) return;
    try {
      await supabase.from('sparepart_purchases').delete().eq('id', purchase.id);
      // Revert stock
      const sp = await supabase.from('spareparts').select('quantity').eq('id', sparepartId).single();
      if (sp.data) {
        await supabase.from('spareparts').update({
          quantity: Math.max(0, (sp.data.quantity || 0) - (purchase.quantity || 0)),
          updated_at: new Date().toISOString(),
        }).eq('id', sparepartId);
      }
      setPurchases(prev => prev.filter(p => p.id !== purchase.id));
      toast.success('Riwayat dihapus, stok dikurangi');
      onUpdate();
    } catch (err) { toast.error((err as Error).message); }
  };

  const formatPrice = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID');

  if (loading) return <div className="text-center py-8 text-slate-400">Memuat...</div>;
  if (purchases.length === 0) return <div className="text-center py-8 text-slate-400">Belum ada riwayat pembelian.</div>;

  return (
    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
      <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
        <div className="col-span-3">Tanggal</div>
        <div className="col-span-2 text-right">Qty</div>
        <div className="col-span-3 text-right">Harga Satuan</div>
        <div className="col-span-3 text-right">Total</div>
        <div className="col-span-1"></div>
      </div>
      {purchases.map(p => (
        <div key={p.id} className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
          <div className="col-span-3 text-sm font-medium text-slate-900 dark:text-white">
            {new Date(p.purchase_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <div className="col-span-2 text-sm text-right font-bold text-slate-900 dark:text-white">{p.quantity}</div>
          <div className="col-span-3 text-sm text-right text-slate-600 dark:text-slate-300">{formatPrice(Number(p.unit_price))}</div>
          <div className="col-span-3 text-sm text-right font-bold text-emerald-600 dark:text-emerald-400">{formatPrice(Number(p.total_price))}</div>
          <div className="col-span-1 text-right">
            {canModify && (
              <button onClick={() => handleDelete(p)} className="p-1 text-slate-400 hover:text-red-500 rounded transition" title="Hapus">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {p.notes && (
            <div className="col-span-12 text-xs text-slate-400 italic pl-1 -mt-1">{p.notes}</div>
          )}
        </div>
      ))}
      <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-3 px-3 flex justify-between text-sm font-bold">
        <span className="text-slate-500">Total Pembelian</span>
        <span className="text-emerald-600 dark:text-emerald-400">
          {formatPrice(purchases.reduce((s, p) => s + Number(p.total_price || 0), 0))}
        </span>
      </div>
    </div>
  );
}

type Tab = 'dashboard' | 'jobs' | 'schedule' | 'inventory' | 'spareparts' | 'packages' | 'staff' | 'cashflow' | 'suppliers' | 'landing' | 'template' | 'databarang';

export default function DashboardApp() {
  const [tab, setTabState] = useState<Tab>('dashboard');
  
  const setTab = (newTab: Tab) => {
    setTabState(newTab);
    if (typeof window !== 'undefined') safeSetItem('bsb_dashboard_tab', newTab);
  };

  const safeSetItem = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`Failed to save to localStorage (${key})`, e);
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove = ['bsb_company_logo', 'bsb_company_name', 'bsb_company_address', 'bsb_company_email', 'bsb_company_phone', 'bsb_company_payment_info'];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && !k.startsWith('sb-') && !k.includes('tab') && !k.includes('theme') && !k.includes('supabase') && !k.includes('categories') && !k.includes('staff')) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (e) {}
      
      const savedTab = localStorage.getItem('bsb_dashboard_tab') as Tab;
      if (savedTab) setTabState(savedTab);
    }
  }, []);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<AppRole>('guest');
  const [currentUserId, setCurrentUserId] = useState('');
  
  interface UserPreferences {
    sidebarCollapsed: boolean;
    showCharts: boolean;
  }
  const [userPref, setUserPref] = useState<UserPreferences>({ sidebarCollapsed: false, showCharts: true });

  const updatePreference = async (key: keyof UserPreferences, value: boolean) => {
    const newPref = { ...userPref, [key]: value };
    setUserPref(newPref);
    if (currentUserId) {
      await supabase.from('profiles').update({ preferences: newPref }).eq('id', currentUserId);
    }
  };

  const [authReady, setAuthReady] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();

  // Inventories & Staff Lists
  const [itemsList, setItemsList] = useState<any[]>([]);

  // Company and Document settings
  const [compName, setCompName] = useState('Beragam Sewa Bali');
  const [compTaxName, setCompTaxName] = useState('');
  const [compNpwp, setCompNpwp] = useState('');
  const [compAddress, setCompAddress] = useState('Jl. By Pass Ngurah Rai, Denpasar, Bali');
  const [compEmail, setCompEmail] = useState('info@beragamsewabali.com');
  const [compPhone, setCompPhone] = useState('08123456789');
  const [compPayment, setCompPayment] = useState('Bank BCA: 1234567890 a.n Beragam Sewa Bali');
  const [compLogo, setCompLogo] = useState<string | null>(null);
  const [compHeaderImg, setCompHeaderImg] = useState<string | null>(null);
  const [compStampImage, setCompStampImage] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string>('');
  const [staffNicknames, setStaffNicknames] = useState<Record<string, string>>({});

  // PDF Template Layout state
  const [pdfTemplateType, setPdfTemplateType] = useState<PDFTemplateLayout['documentType']>('invoice');
  const [pdfTemplates, setPdfTemplates] = useState<Record<string, PDFTemplateLayout>>({
    surat_jalan: defaultTemplate('surat_jalan'),
    invoice: defaultTemplate('invoice'),
    quotation: defaultTemplate('quotation'),
    receipt: defaultTemplate('receipt'),
  });

  // Custom Inventory Categories
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const categoriesList = Array.from(new Set([
    'sound', 'tent', 'chairs', 'tables', 'lighting', 'decoration', 'generator', 'other',
    ...customCategories,
    ...(itemsList?.map(item => item.category).filter(Boolean) || [])
  ]));

  const [statusFilter, setStatusFilter] = useState<JobStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input — only fire query after 400ms of no typing
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals
  const [showJobForm, setShowJobForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [viewingJobId, setViewingJobId] = useState<string | null>(null);

  // Inventories & Staff Lists
  const [staffList, setStaffList] = useState<any[]>([]);
  const [cashflowList, setCashflowList] = useState<any[]>([]);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [landingList, setLandingList] = useState<any[]>([]);
  const [packagesList, setPackagesList] = useState<any[]>([]);

  // Spareparts State
  const [sparepartsList, setSparepartsList] = useState<any[]>([]);
  const [sparepartModalOpen, setSparepartModalOpen] = useState(false);
  const [sparepartModalData, setSparepartModalData] = useState<{ id?: string; name: string; category: string; sku: string } | null>(null);
  const [sparepartPurchaseModalOpen, setSparepartPurchaseModalOpen] = useState(false);
  const [sparepartPurchaseTarget, setSparepartPurchaseTarget] = useState<any>(null);
  const [sparepartHistoryOpen, setSparepartHistoryOpen] = useState(false);
  const [sparepartHistoryTarget, setSparepartHistoryTarget] = useState<any>(null);
  const [sparepartSearchQuery, setSparepartSearchQuery] = useState('');
  const [selectedSparepartCategoryFilter, setSelectedSparepartCategoryFilter] = useState('all');

  const [sparepartsCategoryListState, setSparepartsCategoryListState] = useState<string[]>([]);
  
  useEffect(() => {
    const saved = localStorage.getItem('bsb_custom_sparepart_categories');
    if (saved) {
      try { setSparepartsCategoryListState(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const sparepartsCategoryList = Array.from(new Set([
    'umum', 'mesin', 'kelistrikan', 'ban',
    ...sparepartsCategoryListState,
    ...(sparepartsList?.map(sp => sp.category?.toLowerCase()).filter(Boolean) || [])
  ]));

  const [showNewSparepartCategoryInput, setShowNewSparepartCategoryInput] = useState(false);
  const [newSparepartCategoryName, setNewSparepartCategoryName] = useState('');
  const [sparepartCategoryModalOpen, setSparepartCategoryModalOpen] = useState(false);

  // Data Barang State
  const [databarangItems, setDatabarangItems] = useState<any[]>([]);
  const [databarangSearch, setDatabarangSearch] = useState('');
  const [databarangExpandedItem, setDatabarangExpandedItem] = useState<string | null>(null);
  const [databarangUnits, setDatabarangUnits] = useState<Record<string, any[]>>({});
  const [databarangServiceModal, setDatabarangServiceModal] = useState<{ unitId: string; unitCode: string } | null>(null);
  const [databarangServiceList, setDatabarangServiceList] = useState<Record<string, any[]>>({});
  const [databarangUnitFilter, setDatabarangUnitFilter] = useState('all');

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemModalData, setItemModalData] = useState<{ id?: string; name: string; category: string; quantity: number; sku: string } | null>(null);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Staff Modal State
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffModalData, setStaffModalData] = useState<{ id?: string; email: string; role: string; nickname?: string } | null>(null);
  
  const [staffHistoryModalOpen, setStaffHistoryModalOpen] = useState(false);
  const [staffHistoryData, setStaffHistoryData] = useState<{ id: string; name: string } | null>(null);
  const [staffHistoryJobs, setStaffHistoryJobs] = useState<any[]>([]);
  const [staffHistoryLoading, setStaffHistoryLoading] = useState(false);

  // Cashflow Modal State
  const [cashflowModalOpen, setCashflowModalOpen] = useState(false);
  const [cashflowModalData, setCashflowModalData] = useState<{ id?: string; type: 'inflow' | 'outflow'; category: string; amount: number; description: string; transaction_date: string } | null>(null);

  // Supplier Modal State
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierModalData, setSupplierModalData] = useState<{ id?: string; name: string; contact_name: string; phone: string; email: string } | null>(null);
  const [supplierItemsOpen, setSupplierItemsOpen] = useState(false);
  const [activeSupplierForItems, setActiveSupplierForItems] = useState<{ id: string; name: string } | null>(null);

  // Landing Page Content Modal State
  const [landingModalOpen, setLandingModalOpen] = useState(false);
  const [landingModalData, setLandingModalData] = useState<{ id?: string; section_key: string; title: string; text: string; long_text: string; image_url: string } | null>(null);

  // Package Modal State
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [packageModalData, setPackageModalData] = useState<{ id?: string; name: string; description: string; base_price: string; items: { item_id: string; qty: number }[] } | null>(null);
  const [scheduleView, setScheduleView] = useState<'gantt' | 'calendar'>('gantt');
  const pkgImportRef = useRef<HTMLInputElement>(null);

  const handlePkgImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { packagesInserted, itemsInserted, errors } = await importPackages(file);
      const msg = `${packagesInserted} paket + ${itemsInserted} barang diimpor.`;
      if (errors.length) toast.error(`${msg} ${errors.length} baris gagal.`);
      else toast.success(msg);
      if (packagesInserted || itemsInserted) loadData(true);
    } catch (err: any) {
      toast.error('Gagal impor: ' + err.message);
    } finally {
      if (pkgImportRef.current) pkgImportRef.current.value = '';
    }
  };
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Confirm Modal State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCompName('Beragam Sewa Bali');
      setCompTaxName('');
      setCompAddress('Jl. By Pass Ngurah Rai, Denpasar, Bali');
      setCompEmail('info@beragamsewabali.com');
      setCompPhone('08123456789');
      setCompPayment('Bank BCA: 1234567890 a.n Beragam Sewa Bali');
      setCompLogo(null);
      setCompHeaderImg(null);
      
      const storedCategories = localStorage.getItem('bsb_custom_categories');
      if (storedCategories) {
        try {
          setCustomCategories(JSON.parse(storedCategories));
        } catch(e) {}
      }
      
      supabase.from('site_content').select('*').in('content_key', [
        'bsb_company_name', 'bsb_company_tax_name', 'bsb_company_npwp', 'bsb_company_address', 'bsb_company_email', 'bsb_company_phone', 'bsb_company_payment_info', 'site_logo_dashboard', 'site_header_image', 'bsb_stamp_image', 'bsb_staff_nicknames',
        'bsb_pdf_template_surat_jalan', 'bsb_pdf_template_invoice', 'bsb_pdf_template_quotation', 'bsb_pdf_template_receipt'
      ]).then(({ data }) => {
        if (data && data.length > 0) {
          const getVal = (key: string, def: string) => data.find(d => d.content_key === key)?.content_value || def;
          
          const dbName = getVal('bsb_company_name', '');
          if (dbName) setCompName(dbName);
          
          const dbTaxName = getVal('bsb_company_tax_name', '');
          if (dbTaxName) setCompTaxName(dbTaxName);

          const dbNpwp = getVal('bsb_company_npwp', '');
          if (dbNpwp) setCompNpwp(dbNpwp);
          
          const dbAddress = getVal('bsb_company_address', '');
          if (dbAddress) setCompAddress(dbAddress);
          
          const dbEmail = getVal('bsb_company_email', '');
          if (dbEmail) setCompEmail(dbEmail);
          
          const dbPhone = getVal('bsb_company_phone', '');
          if (dbPhone) setCompPhone(dbPhone);
          
          const dbPayment = getVal('bsb_company_payment_info', '');
          if (dbPayment) setCompPayment(dbPayment);
          
          const dbLogo = getVal('site_logo_dashboard', '');
          if (dbLogo) setCompLogo(dbLogo);
          
          const dbHeader = getVal('site_header_image', '');
          if (dbHeader) setCompHeaderImg(dbHeader);

          const dbStamp = getVal('bsb_stamp_image', '');
          if (dbStamp) setCompStampImage(dbStamp);
          
          const dbNicknames = getVal('bsb_staff_nicknames', '');
          if (dbNicknames) {
            try {
              setStaffNicknames(JSON.parse(dbNicknames));
            } catch (e) {}
          }

          const templateTypes = ['surat_jalan', 'invoice', 'quotation', 'receipt'] as const;
          const loadedTemplates: Record<string, PDFTemplateLayout> = {
            surat_jalan: defaultTemplate('surat_jalan'),
            invoice: defaultTemplate('invoice'),
            quotation: defaultTemplate('quotation'),
            receipt: defaultTemplate('receipt'),
          };
          templateTypes.forEach(t => {
            const raw = getVal(`bsb_pdf_template_${t}`, '');
            if (raw) {
              try { loadedTemplates[t] = JSON.parse(raw); } catch (e) {}
            }
          });
          setPdfTemplates(loadedTemplates);
        }
      });

      const saved = localStorage.getItem('bsb_custom_categories');
      if (saved) {
        try {
          setCustomCategories(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const toggleTheme = () => setTheme(resolvedTheme === 'light' ? 'dark' : 'light');

  // ======== AUTH ========
  useEffect(() => {
    let mounted = true;
    let initialCheckDone = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'INITIAL_SESSION') return;
      
      if (session?.user) {
        setAuthReady(true);
        setUserEmail(session.user.email || '');
        setCurrentUserId(session.user.id);
        try {
          const { data } = await supabase.from('profiles').select('role, preferences').eq('id', session.user.id).single();
          if (mounted) {
            setUserRole((data?.role as AppRole) || 'guest');
            if (data?.preferences) {
              setUserPref({
                sidebarCollapsed: !!(data.preferences as any).sidebarCollapsed,
                showCharts: (data.preferences as any).showCharts !== false,
              });
            }
          }
        } catch { 
          if (mounted) setUserRole('guest'); 
        }
      } else {
        setAuthReady(false);
        setUserEmail('');
        setCurrentUserId('');
        setUserRole('guest');
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted || initialCheckDone) return;
      
      if (session?.user) {
        setAuthReady(true);
        setUserEmail(session.user.email || '');
        setCurrentUserId(session.user.id);
        try {
          const { data } = await supabase.from('profiles').select('role, preferences').eq('id', session.user.id).single();
          if (mounted) {
            setUserRole((data?.role as AppRole) || 'guest');
            if (data?.preferences) {
              setUserPref({
                sidebarCollapsed: !!(data.preferences as any).sidebarCollapsed,
                showCharts: (data.preferences as any).showCharts !== false,
              });
            }
          }
        } catch { 
          if (mounted) setUserRole('guest'); 
        }
      } else {
        setAuthReady(false);
        setUserEmail('');
        setCurrentUserId('');
        setUserRole('guest');
      }
      
      if (mounted) {
        initialCheckDone = true;
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ======== DATA LOADING ========
  const queryClient = useQueryClient();

  // ======== TANSTACK QUERY ========
  const { data: dashboardData, isLoading: queryLoading, isFetching } = useQuery({
    queryKey: ['dashboard', statusFilter, debouncedSearch, userRole],
    enabled: authReady,
    staleTime: 60_000,   // Data stays fresh for 60s — aggressive caching, realtime handles updates
    gcTime: 10 * 60_000, // Cache lives 10 minutes
    refetchOnWindowFocus: false, // Don't refetch just because user alt-tabs
    queryFn: async () => {
      // Run ALL queries in parallel for maximum speed
      const promises: any[] = [
        fetchJobs({ status: statusFilter || undefined, search: debouncedSearch || undefined }),
        fetchDashboardStats(),
        supabase.from('items').select('*').order('name'),
        supabase.from('profiles').select('*').order('email'),
        supabase.from('jobs').select(`id, client_name, venue, job_items ( item_id, source_vendor_id, quantity, is_package, package_id ), job_staff ( profile_id )`).eq('status', 'on_going'),
        supabase.from('site_content').select('content_value').eq('content_key', 'site_logo_dashboard').single(),
        supabase.from('packages').select('*, package_items(item_id, supplier_item_id, qty)').order('name'),
        supabase.from('spareparts').select('*').eq('is_deleted', false).order('name'),
        supabase.from('item_units').select('*').order('unit_code'),
      ];

      // Conditionally add owner/accounting queries
      const hasCashflow = userRole === 'owner' || userRole === 'accounting';
      const isOwner = userRole === 'owner';
      if (hasCashflow) promises.push(supabase.from('cashflow').select('*').order('transaction_date', { ascending: false }));
      if (isOwner) {
        promises.push(supabase.from('suppliers').select('*').eq('is_deleted', false).order('name'));
        promises.push(supabase.from('section_images').select('*').order('id', { ascending: false }));
      }

      const results = await Promise.all(promises);

      const jobsData = results[0];
      const statsData = results[1];
      const iData = results[2]?.data || [];
      const sData = results[3]?.data || [];
      const activeJobsData = results[4]?.data || [];
      const siteLogo = results[5]?.data?.content_value || null;

      let idx = 6;
      const packData = results[idx++]?.data || [];
      const spareData = results[idx++]?.data || [];
      const unitsData = results[idx++]?.data || [];
      const cfData = hasCashflow ? (results[idx++]?.data || []) : [];
      const supData = isOwner ? (results[idx++]?.data || []) : [];
      const landData = isOwner ? (results[idx++]?.data || []) : [];

      return { jobsData, statsData, iData, sData, cfData, supData, landData, activeJobsData, siteLogo, packData, spareData, unitsData };
    }
  });

  // Sync Query Data to State
  useEffect(() => {
    if (dashboardData) {
      setJobs(dashboardData.jobsData);
      setStats(dashboardData.statsData);
      setItemsList(dashboardData.iData);
      setPackagesList(dashboardData.packData);
      setSparepartsList(dashboardData.spareData);
      setDatabarangItems(dashboardData.iData);
      // Group units by item_id — simple one-pass
      const uMap: Record<string, any[]> = {};
      for (const u of (dashboardData.unitsData || [])) {
        (uMap[u.item_id] ||= []).push(u);
      }
      setDatabarangUnits(uMap);
      setStaffList(dashboardData.sData);
      if (userRole === 'owner' || userRole === 'accounting') setCashflowList(dashboardData.cfData);
      if (userRole === 'owner') {
        setSuppliersList(dashboardData.supData);
        setLandingList(dashboardData.landData);
      }
      setActiveJobs(dashboardData.activeJobsData);

      if (dashboardData.siteLogo && typeof document !== 'undefined') {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = dashboardData.siteLogo + '?t=' + new Date().getTime();
      }
      setLoading(false);
    }
  }, [dashboardData, userRole]);

  // Handle loading state — only show spinner on FIRST load, never on background refetches
  const hasLoadedOnce = useRef(false);
  useEffect(() => {
    if (dashboardData) hasLoadedOnce.current = true;
  }, [dashboardData]);
  useEffect(() => {
    if (queryLoading && authReady && !hasLoadedOnce.current) {
      setLoading(true);
    }
  }, [queryLoading, authReady]);
  const updateItemStock = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    try {
      const { error } = await supabase.from('items').update({ quantity: newQuantity }).eq('id', itemId);
      if (error) throw error;
      setItemsList(prev => prev.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item));
      toast.success('Stok berhasil diperbarui');
    } catch (err: any) {
      toast.error('Gagal memperbarui stok: ' + err.message);
    }
  };

  // Backward compatibility for components expecting loadData
  const loadData = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }, [queryClient]);

  // ======== SUPABASE REALTIME (debounced — prevents rapid successive refetches) ========
  const invalidateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!authReady) return;

    const debouncedInvalidate = () => {
      if (invalidateTimer.current) clearTimeout(invalidateTimer.current);
      invalidateTimer.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }, 500); // 500ms cooldown — coalesce rapid changes
    };

    const channel = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cashflow' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spareparts' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sparepart_purchases' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'section_images' }, debouncedInvalidate)
      .subscribe();

    return () => {
      if (invalidateTimer.current) clearTimeout(invalidateTimer.current);
      supabase.removeChannel(channel);
    };
  }, [authReady, queryClient]);

  // ======== HANDLERS ========
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass });
      if (error) throw error;
      setShowLogin(false);
    } catch (err: unknown) {
      setLoginError((err as Error).message || 'Login gagal');
    }
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthReady(false);
    setShowLogin(false);
    setJobs([]);
    setStats(null);
  };

  const handleDeleteJob = async (id: string) => {
    if (!(await showConfirm('Yakin ingin menghapus job ini? Data tidak dapat dikembalikan.'))) return;
    try {
      await deleteJob(id);
      setJobs(prev => prev.filter(j => j.id !== id));
      loadData(true);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleStatusChange = async (id: string, newStatus: JobStatus) => {
    // Optimistic update — instantly reflect change in UI before server confirms
    const previousJobs = [...jobs];
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: newStatus } : j));
    try {
      await updateJobStatus(id, newStatus);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (e) {
      // Rollback on error
      setJobs(previousJobs);
      toast.error((e as Error).message);
    }
  };

  const canModify = userRole === 'owner' || userRole === 'staff';
  const canViewAll = userRole === 'owner' || userRole === 'accounting';

  const generateSkuForCategory = (category: string) => {
    const prefix = category.replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase() || 'IT';
    return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const jobStatusChartData = useMemo(() => {
    if (!stats) return [];
    return (Object.keys(JOB_STATUS_CONFIG) as JobStatus[]).map(status => ({
      name: JOB_STATUS_CONFIG[status].label,
      value: stats.jobsByStatus[status],
      color: JOB_STATUS_CONFIG[status].color
    })).filter(d => d.value > 0);
  }, [stats]);

  // ======== LANDING ATAU LOGIN SCREEN ========
  // Show spinner during initial load to prevent landing page flash
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  if (!authReady) {
    if (!showLogin) {
      return <LandingPage onLoginClick={() => setShowLogin(true)} />;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-700/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl border p-8 w-full max-w-md animate-slide-up relative z-10" >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-red-600/10 flex items-center justify-center mx-auto mb-4 border border-red-600/20 shadow-lg shadow-red-600/10 overflow-hidden">
              {compLogo ? (
                <img src={compLogo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Briefcase className="w-8 h-8 text-red-500" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Beragam Sewa Bali</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">ERP Dashboard System</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Email</label>
              <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition" placeholder="email@example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Password</label>
              <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} required
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition" placeholder="••••••••" />
            </div>
            {loginError && <p className="text-red-400 text-xs text-center bg-red-500/10 py-2 rounded">{loginError}</p>}
            <button type="submit" disabled={loginLoading}
              className="w-full py-2.5 mt-2 bg-red-700 hover:bg-red-600 text-slate-900 dark:text-white font-semibold rounded-lg transition disabled:opacity-50 shadow-lg shadow-emerald-900/20">
              {loginLoading ? 'Memproses...' : 'Login ke Dashboard'}
            </button>
            <button type="button" onClick={() => setShowLogin(false)} className="w-full mt-4 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition">
              &larr; Kembali ke Beranda
            </button>
          </form>
        </div>
      </div>
    );
  }


  // ======== SIDEBAR ========
  const SidebarItem = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: Tab }) => (
    <button onClick={() => { setTab(value); setMobileMenuOpen(false); }} title={userPref.sidebarCollapsed && !mobileMenuOpen ? label : undefined}
      className={`flex items-center transition-all ${userPref.sidebarCollapsed && !mobileMenuOpen ? 'justify-center w-12 h-12 p-0 rounded-xl mx-auto' : 'w-full gap-3 px-4 py-2.5 rounded-xl'} text-sm font-medium ${tab === value ? 'bg-red-600/10 text-red-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-white dark:bg-slate-800'}`}>
      <Icon className="w-5 h-5 shrink-0" />
      {!(userPref.sidebarCollapsed && !mobileMenuOpen) && <span>{label}</span>}
    </button>
  );

  // ======== MAIN RENDER ========
  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-600/10 flex items-center justify-center overflow-hidden">
            {compLogo ? (
              <img src={compLogo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Briefcase className="w-4 h-4 text-red-500" />
            )}
          </div>
          <div className="font-bold text-slate-900 dark:text-white">BSB Dashboard</div>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 -mr-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 ${userPref.sidebarCollapsed && !mobileMenuOpen ? 'w-20 px-2' : 'w-64 px-4'} bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col py-4 shrink-0 overflow-y-auto transition-[width,transform] duration-300 md:relative md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`flex items-center ${userPref.sidebarCollapsed && !mobileMenuOpen ? 'justify-center' : 'justify-between px-2'} mb-2`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/10 flex items-center justify-center overflow-hidden shrink-0">
              {compLogo ? (
                <img src={compLogo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Briefcase className="w-5 h-5 text-red-500" />
              )}
            </div>
            {!(userPref.sidebarCollapsed && !mobileMenuOpen) && (
              <div className="overflow-hidden">
                <div className="text-sm font-bold text-slate-900 dark:text-white truncate">BSB Dashboard</div>
                <div className="text-xs text-slate-500">{userRole.toUpperCase()}</div>
              </div>
            )}
          </div>
          {!(userPref.sidebarCollapsed && !mobileMenuOpen) && (
            <button className="md:hidden text-slate-400 hover:text-slate-900 dark:hover:text-white transition p-1" onClick={() => setMobileMenuOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className={`mt-6 space-y-1 ${userPref.sidebarCollapsed && !mobileMenuOpen ? 'w-full flex flex-col items-center' : 'w-full'}`}>
          <SidebarItem icon={LayoutDashboard} label="Overview" value="dashboard" />
          <SidebarItem icon={Briefcase} label="Jobs & Events" value="jobs" />
          <SidebarItem icon={CalendarDays} label="Schedule" value="schedule" />
          
          {!(userPref.sidebarCollapsed && !mobileMenuOpen) ? (
            <div className="pt-4 pb-2 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Master Data</div>
          ) : <div className="pt-4 pb-2"><div className="w-4 h-px bg-slate-200 dark:bg-slate-800" /></div>}
          
          <SidebarItem icon={Package} label="Menu Barang" value="inventory" />
          <SidebarItem icon={Boxes} label="Data Barang" value="databarang" />
          <SidebarItem icon={Wrench} label="Sparepart" value="spareparts" />
          <SidebarItem icon={Layers} label="Menu Paket" value="packages" />
          <SidebarItem icon={Users} label="Daftar Karyawan" value="staff" />
          {userRole === 'owner' && (
            <SidebarItem icon={Truck} label="Suppliers" value="suppliers" />
          )}
          {userRole === 'owner' && (
            <>
              {!(userPref.sidebarCollapsed && !mobileMenuOpen) ? (
                <div className="pt-4 pb-2 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Super Admin</div>
              ) : <div className="pt-4 pb-2"><div className="w-4 h-px bg-slate-200 dark:bg-slate-800" /></div>}
              <SidebarItem icon={FileSpreadsheet} label="Pengaturan Template" value="template" />
              <SidebarItem icon={Wallet} label="Cashflow" value="cashflow" />
              <SidebarItem icon={Globe} label="Landing Page" value="landing" />
              {!(userPref.sidebarCollapsed && !mobileMenuOpen) ? (
                <a href="https://beragamsewabali.com" target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800">
                  <ExternalLink className="w-5 h-5 shrink-0" />
                  Buka Website
                </a>
              ) : (
                <a href="https://beragamsewabali.com" target="_blank" rel="noopener noreferrer" title="Buka Website"
                  className="flex items-center justify-center w-12 h-12 rounded-xl mx-auto text-sm font-medium transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800">
                  <ExternalLink className="w-5 h-5 shrink-0" />
                </a>
              )}
            </>
          )}
        </div>
        <div className={`mt-auto space-y-2 pt-4 ${userPref.sidebarCollapsed && !mobileMenuOpen ? 'w-full flex flex-col items-center' : 'w-full'}`}>
          {!(userPref.sidebarCollapsed && !mobileMenuOpen) && (
            <div className="px-4 py-2 text-xs text-slate-500 truncate">{userEmail}</div>
          )}
          
          <button onClick={() => updatePreference('sidebarCollapsed', !userPref.sidebarCollapsed)} title={userPref.sidebarCollapsed && !mobileMenuOpen ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className={`flex items-center transition-all ${userPref.sidebarCollapsed && !mobileMenuOpen ? 'justify-center w-12 h-12 p-0 rounded-xl mx-auto' : 'w-full gap-3 px-4 py-2 rounded-xl'} text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800`}>
            {userPref.sidebarCollapsed && !mobileMenuOpen ? <PanelLeftOpen className="w-5 h-5 shrink-0" /> : <><PanelLeftClose className="w-5 h-5 shrink-0" /> <span>Minimize Sidebar</span></>}
          </button>

          {mounted && (
            <button onClick={toggleTheme} title={resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              className={`flex items-center transition-all ${userPref.sidebarCollapsed && !mobileMenuOpen ? 'justify-center w-12 h-12 p-0 rounded-xl mx-auto' : 'w-full gap-3 px-4 py-2 rounded-xl'} text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800`}>
              {resolvedTheme === 'dark' ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
              {!(userPref.sidebarCollapsed && !mobileMenuOpen) && <span>{resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>
          )}
          <button onClick={handleLogout} title="Logout"
            className={`flex items-center transition-all ${userPref.sidebarCollapsed && !mobileMenuOpen ? 'justify-center w-12 h-12 p-0 rounded-xl mx-auto' : 'w-full gap-3 px-4 py-2 rounded-xl'} text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10`}>
            <LogOut className="w-5 h-5 shrink-0" /> 
            {!(userPref.sidebarCollapsed && !mobileMenuOpen) && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* === OVERVIEW TAB === */}
            {tab === 'dashboard' && stats && (
              <div className="animate-fade-in space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Dashboard Overview</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Ringkasan operasional & keuangan</p>
                  </div>
                  {canModify && (
                    <button onClick={() => { setEditingJob(null); setShowJobForm(true); }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-600 text-white font-semibold rounded-xl transition text-sm w-full sm:w-auto justify-center">
                      <Plus className="w-4 h-4" /> Job Baru
                    </button>
                  )}
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <StatCard icon={Briefcase} label="Total Jobs" value={stats.totalJobs.toString()} color="#3B82F6" />
                  <StatCard icon={Activity} label="Jobs Aktif" value={stats.activeJobs.toString()} color="#F59E0B" />
                  {canViewAll && <StatCard icon={TrendingUp} label="Pendapatan (Jobs)" value={formatRupiah(stats.totalRevenue)} color="#10B981" />}
                  {canViewAll && <StatCard icon={DollarSign} label="Laba Bersih (Jobs)" value={formatRupiah(stats.netProfit)} color="#8B5CF6" />}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                  <StatCard icon={Package} label="Total Inventory" value={stats.totalInventory.toString()} color="#ec4899" />
                  <StatCard icon={Truck} label="Suppliers" value={stats.totalSuppliers.toString()} color="#8b5cf6" />
                  <StatCard icon={Image} label="Gallery" value={stats.landingPageGallery.toString()} color="#06b6d4" />
                  {canViewAll && <StatCard icon={TrendingUp} label="Cashflow In" value={formatRupiah(stats.cashflowIn)} color="#14b8a6" />}
                  {canViewAll && <StatCard icon={DollarSign} label="Cashflow Out" value={formatRupiah(stats.cashflowOut)} color="#ef4444" />}
                </div>

                {/* Status Distribution */}
                <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-slate-900 dark:text-white font-semibold">Distribusi Status Job</h3>
                    <button onClick={() => updatePreference('showCharts', !userPref.showCharts)}
                      className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <ChartPie className="w-4 h-4" />
                      {userPref.showCharts ? 'Tampilan Ringkas' : 'Tampilan Grafik'}
                    </button>
                  </div>
                  
                  {userPref.showCharts ? (
                    <div className="flex flex-col md:flex-row items-center gap-6 md:h-64">
                      <div className="w-full md:w-1/2 h-48 md:h-full">
                        <ResponsiveContainer width="100%" height="100%" minHeight={192}>
                          <PieChart>
                            <Pie data={jobStatusChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                              {jobStatusChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontWeight: 'bold' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-full md:w-1/2 flex flex-col justify-center space-y-3">
                        {jobStatusChartData.map(d => (
                          <div key={d.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{d.name}</span>
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {(Object.keys(JOB_STATUS_CONFIG) as JobStatus[]).map(status => (
                        <div key={status} className="text-center p-3 rounded-xl" style={{ background: JOB_STATUS_CONFIG[status].bg }}>
                          <div className="text-2xl font-bold" style={{ color: JOB_STATUS_CONFIG[status].color }}>{stats.jobsByStatus[status]}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{JOB_STATUS_CONFIG[status].label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Jobs */}
                <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl border p-6" >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-slate-900 dark:text-white font-semibold">Job Terbaru</h3>
                    <button onClick={() => setTab('jobs')} className="text-red-500 text-sm hover:text-emerald-300 flex items-center gap-1">
                      Lihat Semua <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {jobs.slice(0, 5).map(job => (
                      <div key={job.id} onClick={() => setViewingJobId(job.id)}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-white dark:bg-slate-50 dark:bg-slate-800/50 transition cursor-pointer group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: JOB_STATUS_CONFIG[job.status].color }} />
                          <div className="min-w-0">
                            <div className="text-sm text-slate-900 dark:text-white font-medium truncate">{job.client_name}</div>
                            <div className="text-xs text-slate-500 truncate">{job.venue} • {formatDate(job.job_date)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="status-badge" style={{ color: JOB_STATUS_CONFIG[job.status].color, background: JOB_STATUS_CONFIG[job.status].bg }}>
                            {JOB_STATUS_CONFIG[job.status].label}
                          </span>
                          <Eye className="w-4 h-4 text-slate-600 group-hover:text-red-500 transition" />
                        </div>
                      </div>
                    ))}
                    {jobs.length === 0 && <p className="text-center text-slate-500 py-6 text-sm">Belum ada data job.</p>}
                  </div>
                </div>

              </div>
            )}

            {/* === TEMPLATE TAB === */}
            {tab === 'template' && userRole === 'owner' && (
              <div className="animate-fade-in space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pengaturan Template</h1>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Ubah kop dokumen surat jalan, invoice, dan logo perusahaan</p>
                </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-slate-900 dark:text-white font-semibold">Pengaturan Template Invoice & Surat Jalan</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Ubah kop dokumen surat jalan, invoice, serta bank info BCA dan upload berkas logo.</p>
                      </div>
                    </div>
                    
                    {saveSuccess && (
                      <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3 animate-fade-in">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">{saveSuccess}</p>
                      </div>
                    )}
                    
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      safeSetItem('bsb_company_name', compName);
                      safeSetItem('bsb_company_tax_name', compTaxName);
                      safeSetItem('bsb_company_npwp', compNpwp);
                      safeSetItem('bsb_company_address', compAddress);
                      safeSetItem('bsb_company_email', compEmail);
                      safeSetItem('bsb_company_phone', compPhone);
                      safeSetItem('bsb_company_payment_info', compPayment);
                      
                      const updates = [
                        { content_key: 'bsb_company_name', content_value: compName },
                        { content_key: 'bsb_company_tax_name', content_value: compTaxName },
                        { content_key: 'bsb_company_npwp', content_value: compNpwp },
                        { content_key: 'bsb_company_address', content_value: compAddress },
                        { content_key: 'bsb_company_email', content_value: compEmail },
                        { content_key: 'bsb_company_phone', content_value: compPhone },
                        { content_key: 'bsb_company_payment_info', content_value: compPayment }
                      ];
                      
                      if (compLogo !== null) {
                        updates.push({ content_key: 'site_logo_dashboard', content_value: compLogo });
                      }
                      
                      if (compHeaderImg !== null) {
                        updates.push({ content_key: 'site_header_image', content_value: compHeaderImg });
                      }

                      if (compStampImage !== null) {
                        updates.push({ content_key: 'bsb_stamp_image', content_value: compStampImage });
                      }
                      
                      try {
                        const { error } = await supabase.from('site_content').upsert(updates, { onConflict: 'content_key' });
                        if (error) throw error;
                        setSaveSuccess('Pengaturan template perusahaan berhasil disimpan dan disinkronisasikan!');
                        setTimeout(() => setSaveSuccess(''), 3000);
                      } catch (err) {
                        setSaveSuccess('Tersimpan secara lokal, tapi gagal sinkron ke server: ' + (err as Error).message);
                        setTimeout(() => setSaveSuccess(''), 5000);
                      }
                    }} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Nama Perusahaan</label>
                          <input type="text" value={compName} onChange={e => setCompName(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-red-600 transition" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Company Tax Name (Opsional)</label>
                          <input type="text" value={compTaxName} onChange={e => setCompTaxName(e.target.value)} placeholder="Misal: PT. PRAVEN BALI PRODUCTION"
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-red-600 transition" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">NPWP Perusahaan (Opsional)</label>
                          <input type="text" value={compNpwp} onChange={e => setCompNpwp(e.target.value)} placeholder="Misal: 01.234.567.8-901.000"
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-red-600 transition" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Alamat Perusahaan</label>
                          <input type="text" value={compAddress} onChange={e => setCompAddress(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-red-600 transition" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">No. Telepon / WhatsApp</label>
                          <input type="text" value={compPhone} onChange={e => setCompPhone(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-red-600 transition" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Alamat Email</label>
                          <input type="email" value={compEmail} onChange={e => setCompEmail(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-red-600 transition" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Informasi Pembayaran / Rekening BCA</label>
                          <input type="text" value={compPayment} onChange={e => setCompPayment(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-red-600 transition" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Alamat Lengkap Perusahaan</label>
                        <input type="text" value={compAddress} onChange={e => setCompAddress(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-red-600 transition" />
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Logo Perusahaan (.png / .jpg)</label>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <input type="file" accept="image/*" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const base64 = reader.result as string;
                                setCompLogo(base64);
                              };
                              reader.readAsDataURL(file);
                            }
                          }} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 dark:file:bg-red-500/10 dark:file:text-red-400" />
                          {compLogo && (
                            <img src={compLogo} alt="Logo Preview" className="w-12 h-12 object-contain rounded border border-slate-200 dark:border-slate-700 bg-white shrink-0" />
                          )}
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Kop Surat / Header PDF Full Width (Opsional)</label>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <input type="file" accept="image/*" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const base64 = reader.result as string;
                                setCompHeaderImg(base64);
                              };
                              reader.readAsDataURL(file);
                            }
                          }} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 dark:file:bg-red-500/10 dark:file:text-red-400" />
                          {compHeaderImg && (
                            <img src={compHeaderImg} alt="Header Preview" className="h-12 object-contain rounded border border-slate-200 dark:border-slate-700 bg-white shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Jika diisi, gambar ini akan ditempatkan pada bagian paling atas PDF selebar kertas.</p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Gambar Stempel / Cap Perusahaan (Opsional)</label>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <input type="file" accept="image/*" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const base64 = reader.result as string;
                                setCompStampImage(base64);
                              };
                              reader.readAsDataURL(file);
                            }
                          }} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 dark:file:bg-red-500/10 dark:file:text-red-400" />
                          {compStampImage && (
                            <img src={compStampImage} alt="Stamp Preview" className="h-12 object-contain rounded border border-slate-200 dark:border-slate-700 bg-white shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Stempel akan muncul di antara tanggal dan nama perusahaan pada PDF &amp; Excel yang digenerate.</p>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        {compHeaderImg && (
                          <button type="button" onClick={() => setCompHeaderImg('')} className="px-4 py-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-bold rounded-xl text-xs transition">
                            Hapus Header
                          </button>
                        )}
                        {compStampImage && (
                          <button type="button" onClick={() => setCompStampImage('')} className="px-4 py-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-bold rounded-xl text-xs transition">
                            Hapus Stempel
                          </button>
                        )}
                        {compLogo && (
                          <button type="button" onClick={() => setCompLogo('')} className="px-4 py-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-bold rounded-xl text-xs transition">
                            Hapus Logo
                          </button>
                        )}
                        <button type="submit" className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-red-500/25">
                          Simpan Pengaturan
                        </button>
                      </div>
                    </form>

              </div>

              {/* PDF Template Layout Editor with Gridstack */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-6 mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-slate-900 dark:text-white font-semibold">Edit Layout PDF</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Atur posisi header, judul, tabel, stempel, dan lainnya dengan drag & drop</p>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  {(['surat_jalan', 'invoice', 'quotation', 'receipt'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setPdfTemplateType(type)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                        pdfTemplateType === type
                          ? 'bg-violet-600 text-white shadow-md shadow-violet-500/25'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {type === 'surat_jalan' ? 'Surat Jalan' : type === 'invoice' ? 'Invoice' : type === 'quotation' ? 'Quotation' : 'Kuitansi'}
                    </button>
                  ))}
                </div>

                <PDFTemplateEditor
                  template={pdfTemplates[pdfTemplateType]}
                  onChange={(updated) => {
                    setPdfTemplates(prev => ({
                      ...prev,
                      [pdfTemplateType]: updated,
                    }));
                  }}
                />

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const current = pdfTemplates[pdfTemplateType];
                        const types: PDFTemplateLayout['documentType'][] = ['surat_jalan', 'invoice', 'quotation', 'receipt'];
                        const ops = types.map(t => {
                          const clone = { ...current, documentType: t };
                          return supabase.from('site_content').upsert({
                            content_key: `bsb_pdf_template_${t}`,
                            content_value: JSON.stringify(clone),
                          }, { onConflict: 'content_key' });
                        });
                        await Promise.all(ops);
                        const newAll: Record<string, PDFTemplateLayout> = {};
                        types.forEach(t => { newAll[t] = { ...current, documentType: t }; });
                        setPdfTemplates(newAll);
                        setSaveSuccess('Layout diterapkan ke semua jenis dokumen!');
                        setTimeout(() => setSaveSuccess(''), 3000);
                      } catch (err) {
                        setSaveSuccess('Gagal: ' + (err as Error).message);
                        setTimeout(() => setSaveSuccess(''), 5000);
                      }
                    }}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Terapkan ke Semua
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const key = `bsb_pdf_template_${pdfTemplateType}`;
                        const current = pdfTemplates[pdfTemplateType];
                        const res = await supabase.from('site_content').upsert({
                          content_key: key,
                          content_value: JSON.stringify(current),
                        }, { onConflict: 'content_key' });
                        if (res.error) throw res.error;
                        setSaveSuccess(`Layout ${pdfTemplateType} berhasil disimpan!`);
                        setTimeout(() => setSaveSuccess(''), 3000);
                      } catch (err) {
                        setSaveSuccess('Gagal menyimpan: ' + (err as Error).message);
                        setTimeout(() => setSaveSuccess(''), 5000);
                      }
                    }}
                    className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-violet-500/25"
                  >
                    Simpan Layout
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* === JOBS LIST TAB === */}
            {tab === 'jobs' && (
              <div className="animate-fade-in space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Manajemen Job & Event</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Kelola penyewaan peralatan event</p>
                  </div>
                  {canModify && (
                    <button onClick={() => { setEditingJob(null); setShowJobForm(true); }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-600 text-white font-semibold rounded-xl transition text-sm w-full sm:w-auto justify-center">
                      <Plus className="w-4 h-4" /> Job Baru
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari client, venue..."
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 outline-none focus:border-red-600 transition text-sm" />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as JobStatus | '')}
                      className="pl-10 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-red-600 transition text-sm appearance-none cursor-pointer">
                      <option value="">Semua Status</option>
                      {(Object.keys(JOB_STATUS_CONFIG) as JobStatus[]).map(s => (
                        <option key={s} value={s}>{JOB_STATUS_CONFIG[s].label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Job Cards */}
                <div className="space-y-3">
                  {jobs.map(job => (
                    <div key={job.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-600 transition group" >
                      <div className="flex items-center gap-4 min-w-0 flex-1 w-full cursor-pointer" onClick={() => setViewingJobId(job.id)}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: JOB_STATUS_CONFIG[job.status].bg }}>
                          <Briefcase className="w-5 h-5" style={{ color: JOB_STATUS_CONFIG[job.status].color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-slate-900 dark:text-white font-semibold truncate">{job.client_name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{job.venue} • {formatDate(job.job_date)}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 shrink-0 w-full md:w-auto md:ml-4">
                        {canViewAll && <span className="text-red-500 font-semibold text-sm hidden lg:block">{formatRupiah(job.total_rental_fee)}</span>}
                        <select value={job.status} onChange={e => handleStatusChange(job.id, e.target.value as JobStatus)}
                          disabled={!canModify}
                          className="px-3 py-1.5 text-xs font-semibold rounded-full border-0 outline-none cursor-pointer"
                          style={{ color: JOB_STATUS_CONFIG[job.status].color, background: JOB_STATUS_CONFIG[job.status].bg }}>
                          {(Object.keys(JOB_STATUS_CONFIG) as JobStatus[]).map(s => (
                            <option key={s} value={s} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white" style={{ color: JOB_STATUS_CONFIG[s as JobStatus].color }}>
                              {JOB_STATUS_CONFIG[s].label}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => setViewingJobId(job.id)} className="p-2 hover:bg-slate-700 rounded-lg transition" title="Lihat Detail">
                          <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400 hover:text-red-500" />
                        </button>
                        {canModify && (
                          <>
                            <button onClick={() => { setEditingJob(job); setShowJobForm(true); }} className="p-2 hover:bg-slate-700 rounded-lg transition" title="Edit">
                              <Edit className="w-4 h-4 text-slate-500 dark:text-slate-400 hover:text-blue-400" />
                            </button>
                            {userRole === 'owner' && (
                              <button onClick={() => handleDeleteJob(job.id)} className="p-2 hover:bg-red-500/10 rounded-lg transition" title="Hapus">
                                <Trash2 className="w-4 h-4 text-slate-500 hover:text-red-400" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {jobs.length === 0 && (
                    <div className="text-center py-16">
                      <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-500 dark:text-slate-400">Tidak ada job ditemukan.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === SCHEDULE TAB === */}
            {tab === 'schedule' && (
              <div className="animate-fade-in space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Schedule Timeline</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Visualisasi jadwal setup, event, dan bongkar</p>
                  </div>
                  <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 self-start">
                    <button onClick={() => setScheduleView('gantt')} className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition ${scheduleView === 'gantt' ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>Gantt</button>
                    <button onClick={() => setScheduleView('calendar')} className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition ${scheduleView === 'calendar' ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>Kalender</button>
                  </div>
                </div>
                {scheduleView === 'gantt'
                  ? <GanttScheduler jobs={jobs} onJobClick={(id) => setViewingJobId(id)} />
                  : <MonthCalendar jobs={jobs} onJobClick={(id) => setViewingJobId(id)} />}
              </div>
            )}

            {/* === INVENTORY TAB === */}
            {tab === 'inventory' && (
              <div className="animate-fade-in space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Menu Barang</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Daftar inventaris alat dan barang</p>
                  </div>
                  {canModify && (
                    <div className="flex items-center gap-2 w-full sm:w-auto flex-col sm:flex-row">
                      <button onClick={() => setCategoryModalOpen(true)} className="flex-1 w-full sm:w-auto flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition text-sm shadow-sm justify-center">
                        <Filter className="w-4 h-4" /> Kelola Kategori
                      </button>
                      <button onClick={() => {
                        const initialCat = categoriesList.length > 0 ? categoriesList[0] : 'other';
                        setItemModalData({ name: '', category: initialCat, quantity: 1, sku: generateSkuForCategory(initialCat) });
                        setItemModalOpen(true);
                      }} className="flex-1 w-full sm:w-auto flex items-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-600 text-white font-semibold rounded-xl transition text-sm shadow-md shadow-red-500/20 justify-center">
                        <Plus className="w-4 h-4" /> Tambah Barang
                      </button>
                    </div>
                  )}
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-4">
                  <div className="mb-4 flex flex-col sm:flex-row gap-3">
                    <div className="relative w-full sm:max-w-sm">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={itemSearchQuery} onChange={e => setItemSearchQuery(e.target.value)} placeholder="Cari barang..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-red-600 transition" />
                    </div>
                    <select value={selectedCategoryFilter} onChange={(e) => setSelectedCategoryFilter(e.target.value)} className="w-full sm:w-48 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-red-600 transition">
                      <option value="all">Semua Kategori</option>
                      {categoriesList.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  {itemsList.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-500 dark:text-slate-400">Belum ada barang di database.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {itemsList.filter(item => {
                        const matchesSearch = item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) || item.category?.toLowerCase().includes(itemSearchQuery.toLowerCase());
                        const matchesCategory = selectedCategoryFilter === 'all' || item.category === selectedCategoryFilter;
                        return matchesSearch && matchesCategory;
                      }).map(item => {
                        const itemActiveJobs = activeJobs.filter(job => job.job_items?.some((ji: any) => {
                          if (!ji.is_package && ji.item_id === item.id) return true;
                          if (ji.is_package && ji.package_id) {
                            const pkg = packagesList.find(p => p.id === ji.package_id);
                            if (pkg && pkg.package_items?.some((pi: any) => pi.item_id === item.id)) return true;
                          }
                          return false;
                        }));
                        const usedQuantity = itemActiveJobs.reduce((acc, job) => {
                          const directItem = job.job_items.find((ji: any) => !ji.is_package && ji.item_id === item.id);
                          let totalUsed = directItem ? directItem.quantity : 0;
                          
                          job.job_items.forEach((ji: any) => {
                            if (ji.is_package && ji.package_id) {
                              const pkg = packagesList.find(p => p.id === ji.package_id);
                              if (pkg) {
                                const packageItemMatch = pkg.package_items?.find((pi: any) => pi.item_id === item.id);
                                if (packageItemMatch) {
                                  totalUsed += (ji.quantity || 1) * (packageItemMatch.qty || 1);
                                }
                              }
                            }
                          });
                          return acc + totalUsed;
                        }, 0);
                        
                        return (
                        <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition group gap-3 md:gap-0">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
                              <Package className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">{item.name}</div>
                              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-1">
                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">Kategori: {item.category || '-'}</span>
                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded flex items-center gap-2">
                                  Stok Total: 
                                  {canModify ? (
                                    <span className="flex items-center gap-1 bg-white dark:bg-slate-700 px-1 py-0.5 rounded shadow-sm border border-slate-200 dark:border-slate-600">
                                      <button onClick={() => updateItemStock(item.id, (item.quantity || 0) - 1)} className="w-4 h-4 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-500 transition font-mono leading-none">-</button>
                                      <span className="font-bold min-w-[1.25rem] text-center">{item.quantity || 0}</span>
                                      <button onClick={() => updateItemStock(item.id, (item.quantity || 0) + 1)} className="w-4 h-4 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-500 transition font-mono leading-none">+</button>
                                    </span>
                                  ) : (
                                    <span className="font-bold">{item.quantity || 0}</span>
                                  )}
                                </span>
                                {usedQuantity > 0 && (
                                  <>
                                    <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded font-medium">Sedang Dipakai: {usedQuantity}</span>
                                    <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded font-medium">Sisa Tersedia: {Math.max(0, (item.quantity || 0) - usedQuantity)}</span>
                                  </>
                                )}
                              </div>
                              {itemActiveJobs.length > 0 && (
                                <div className="text-xs text-red-600 dark:text-red-400 mt-1.5 flex items-center gap-1">
                                  <Activity className="w-3 h-3" /> Job Aktif: {itemActiveJobs.map(j => j.client_name).join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                          {canModify && (
                            <div className="flex items-center gap-2 mt-3 md:mt-0 justify-end w-full md:w-auto border-t md:border-0 border-slate-100 dark:border-slate-800 pt-3 md:pt-0">
                              <button onClick={() => {
                                setItemModalData({ id: item.id, name: item.name, category: item.category || 'other', quantity: item.quantity || 1, sku: item.sku || `SKU-${Date.now()}` });
                                setItemModalOpen(true);
                              }} className="p-2 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => {
                                setConfirmModalConfig({
                                  title: 'Hapus Barang',
                                  message: `Apakah Anda yakin ingin menghapus barang "${item.name}" dari inventaris?`,
                                  onConfirm: () => {
                                    supabase.from('items').delete().eq('id', item.id).then(() => {
                                      loadData();
                                      setConfirmModalOpen(false);
                                    });
                                  }
                                });
                                setConfirmModalOpen(true);
                              }} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === SPAREPARTS TAB === */}
            {tab === 'spareparts' && (
              <div className="animate-fade-in space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Menu Sparepart</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Kelola sparepart dan riwayat pembelian</p>
                  </div>
                  {canModify && (
                    <div className="flex items-center gap-2 w-full sm:w-auto flex-col sm:flex-row">
                      <button onClick={() => setSparepartCategoryModalOpen(true)} className="flex-1 w-full sm:w-auto flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition text-sm shadow-sm justify-center">
                        <Filter className="w-4 h-4" /> Kelola Kategori
                      </button>
                      <button onClick={() => {
                        setSparepartModalData({ name: '', category: 'umum', sku: `SP-${Math.floor(1000 + Math.random() * 9000)}` });
                        setSparepartModalOpen(true);
                      }} className="flex-1 w-full sm:w-auto flex items-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-600 text-white font-semibold rounded-xl transition text-sm shadow-md shadow-red-500/20 justify-center">
                        <Plus className="w-4 h-4" /> Tambah Sparepart
                      </button>
                    </div>
                  )}
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-4">
                  <div className="mb-4 flex flex-col sm:flex-row gap-3">
                    <div className="relative w-full sm:max-w-sm">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={sparepartSearchQuery} onChange={e => setSparepartSearchQuery(e.target.value)} placeholder="Cari sparepart..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-red-600 transition" />
                    </div>
                    <select value={selectedSparepartCategoryFilter} onChange={(e) => setSelectedSparepartCategoryFilter(e.target.value)} className="w-full sm:w-48 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-red-600 transition">
                      <option value="all">Semua Kategori</option>
                      {sparepartsCategoryList.map(cat => (
                        <option key={cat} value={cat} className="capitalize">{cat}</option>
                      ))}
                    </select>
                  </div>
                  {sparepartsList.length === 0 ? (
                    <div className="text-center py-12">
                      <Wrench className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-500 dark:text-slate-400">Belum ada sparepart di database.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sparepartsList.filter(sp => {
                        const matchesSearch = sp.name.toLowerCase().includes(sparepartSearchQuery.toLowerCase()) ||
                        sp.category?.toLowerCase().includes(sparepartSearchQuery.toLowerCase()) ||
                        sp.sku?.toLowerCase().includes(sparepartSearchQuery.toLowerCase());
                        const matchesCategory = selectedSparepartCategoryFilter === 'all' || sp.category?.toLowerCase() === selectedSparepartCategoryFilter;
                        return matchesSearch && matchesCategory;
                      }).map(sp => (
                        <div key={sp.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition group gap-3 md:gap-0">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                              <Wrench className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">{sp.name}</div>
                              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-1">
                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">SKU: {sp.sku}</span>
                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded capitalize">Kategori: {sp.category || '-'}</span>
                                <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded font-bold">Stok: {sp.quantity || 0}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3 md:mt-0 justify-end w-full md:w-auto border-t md:border-0 border-slate-100 dark:border-slate-800 pt-3 md:pt-0">
                            <button onClick={() => {
                              setSparepartHistoryTarget(sp);
                              setSparepartHistoryOpen(true);
                            }} className="p-2 text-slate-400 hover:text-amber-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition" title="Riwayat Beli">
                              <History className="w-4 h-4" />
                            </button>
                            {canModify && (
                              <>
                                <button onClick={() => {
                                  setSparepartPurchaseTarget(sp);
                                  setSparepartPurchaseModalOpen(true);
                                }} className="p-2 text-slate-400 hover:text-emerald-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition" title="Catat Pembelian">
                                  <ShoppingCart className="w-4 h-4" />
                                </button>
                                <button onClick={() => {
                                  setSparepartModalData({ id: sp.id, name: sp.name, category: sp.category || 'umum', sku: sp.sku });
                                  setSparepartModalOpen(true);
                                }} className="p-2 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition" title="Edit">
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => {
                                  setConfirmModalConfig({
                                    title: 'Hapus Sparepart',
                                    message: `Hapus sparepart "${sp.name}" beserta riwayat pembeliannya?`,
                                    onConfirm: async () => {
                                      await supabase.from('spareparts').update({ is_deleted: true }).eq('id', sp.id);
                                      loadData(true);
                                      setConfirmModalOpen(false);
                                    }
                                  });
                                  setConfirmModalOpen(true);
                                }} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition" title="Hapus">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === DATA BARANG TAB === */}
            {tab === 'databarang' && (
              <div className="animate-fade-in space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Data Barang</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Lacak setiap unit barang, riwayat service, dan status</p>
                  </div>
                </div>

                {/* Search + Filter */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-4">
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <div className="relative w-full sm:max-w-sm">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={databarangSearch} onChange={e => setDatabarangSearch(e.target.value)} placeholder="Cari nama barang..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-red-600 transition" />
                    </div>
                    <select value={databarangUnitFilter} onChange={e => setDatabarangUnitFilter(e.target.value)}
                      className="w-full sm:w-40 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-red-600 transition">
                      <option value="all">Semua Status</option>
                      <option value="ready">Ready</option>
                      <option value="rented">Disewa</option>
                      <option value="damaged">Rusak</option>
                      <option value="service">Service</option>
                    </select>
                  </div>

                  {/* Item List with Expandable Units */}
                  {databarangItems.length === 0 ? (
                    <div className="text-center py-12">
                      <Boxes className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-500 dark:text-slate-400">Belum ada barang di database.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {databarangItems.filter(item => 
                        item.name.toLowerCase().includes(databarangSearch.toLowerCase()) ||
                        item.sku?.toLowerCase().includes(databarangSearch.toLowerCase())
                      ).map(item => {
                        const units = (databarangUnits[item.id] || []).filter(u => 
                          databarangUnitFilter === 'all' || u.status === databarangUnitFilter
                        );
                        const isExpanded = databarangExpandedItem === item.id;
                        return (
                          <div key={item.id} className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                            {/* Item Header */}
                            <button onClick={() => setDatabarangExpandedItem(isExpanded ? null : item.id)}
                              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition text-left">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                                  <Boxes className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-900 dark:text-white">{item.name}</div>
                                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">SKU: {item.sku || '-'}</span>
                                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">Total Unit: {units.length}/{item.quantity || 0}</span>
                                    <span className={`px-2 py-0.5 rounded font-medium ${
                                      item.status === 'ready' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                                      item.status === 'rented' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                                      'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}>{item.status || 'ready'}</span>
                                  </div>
                                </div>
                              </div>
                              <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>

                            {/* Expanded Units */}
                            {isExpanded && (
                              <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 p-4" data-item-id={item.id}>
                                {canModify && units.length < (item.quantity || 0) && (
                                  <button onClick={async () => {
                                    const currentCount = units.length;
                                    const targetCount = item.quantity || 0;
                                    const toAdd = targetCount - currentCount;
                                    if (toAdd <= 0) return;
                                    const sku = item.sku || item.name.substring(0, 3).toUpperCase();
                                    const newUnits = [];
                                    for (let i = currentCount + 1; i <= targetCount; i++) {
                                      newUnits.push({
                                        item_id: item.id,
                                        unit_code: `SD-${sku}-${i}`,
                                        status: 'ready'
                                      });
                                    }
                                    const { error } = await supabase.from('item_units').insert(newUnits);
                                    if (error) { toast.error(error.message); return; }
                                    toast.success(`${toAdd} unit baru ditambahkan`);
                                    loadData(true);
                                  }} className="mb-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition flex items-center gap-2">
                                    <Plus className="w-4 h-4" /> Generate {item.quantity - units.length} Unit Baru
                                  </button>
                                )}

                                {units.length === 0 ? (
                                  <p className="text-center text-slate-500 py-4 text-sm">Belum ada unit. Klik tombol di atas untuk generate.</p>
                                ) : (
                                  <>
                                    {/* Unit search */}
                                    <input type="text" placeholder="Cari unit..." onChange={e => {
                                      const q = e.target.value.toLowerCase();
                                      const rows = document.querySelectorAll(`[data-item-id="${item.id}"] .unit-row`);
                                      rows.forEach((row: any) => {
                                        const code = row.querySelector('.unit-code')?.textContent?.toLowerCase() || '';
                                        row.style.display = code.includes(q) ? '' : 'none';
                                      });
                                    }} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm mb-3 outline-none focus:border-red-500 text-slate-900 dark:text-white" />
                                    <div className="space-y-1 max-h-80 overflow-y-auto">
                                    {units.map(unit => (
                                      <div key={unit.id} className="unit-row flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className="unit-code text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 truncate">{unit.unit_code}</span>
                                          <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                                            unit.status === 'ready' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                                            unit.status === 'rented' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                                            unit.status === 'damaged' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                            unit.status === 'service' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                            'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                          }`}>{unit.status}</span>
                                          {unit.notes && <span className="text-[10px] text-slate-400 truncate hidden sm:inline">{unit.notes}</span>}
                                        </div>
                                        <div className="flex items-center gap-0.5 shrink-0">
                                          {/* Inline status quick-set */}
                                          <select value={unit.status} onChange={async (e) => {
                                            await supabase.from('item_units').update({ status: e.target.value, updated_at: new Date().toISOString() }).eq('id', unit.id);
                                            loadData(true);
                                          }} className="text-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 outline-none text-slate-600 dark:text-slate-400">
                                            <option value="ready">Ready</option>
                                            <option value="rented">Disewa</option>
                                            <option value="damaged">Rusak</option>
                                            <option value="service">Service</option>
                                          </select>
                                          <button onClick={async () => {
                                            setDatabarangServiceModal({ unitId: unit.id, unitCode: unit.unit_code });
                                            const { data } = await supabase.from('unit_service_history')
                                              .select('*').eq('unit_id', unit.id).order('service_date', { ascending: false });
                                            setDatabarangServiceList(prev => ({ ...prev, [unit.id]: data || [] }));
                                          }} className="p-1 text-slate-400 hover:text-blue-500 rounded transition" title="Riwayat Service">
                                            <ClipboardList className="w-3.5 h-3.5" />
                                          </button>
                                          {canModify && (
                                            <button onClick={async () => {
                                              const c = await showConfirm(`Hapus unit ${unit.unit_code}?`);
                                              if (!c) return;
                                              await supabase.from('item_units').delete().eq('id', unit.id);
                                              loadData(true);
                                            }} className="p-1 text-slate-400 hover:text-red-500 rounded transition" title="Hapus">
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Service History Modal */}
                {databarangServiceModal && (
                  <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 py-10 overflow-y-auto animate-fade-in" onClick={() => setDatabarangServiceModal(null)}>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-[2rem] p-4 sm:p-6 w-full max-w-lg relative animate-slide-up my-auto max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setDatabarangServiceModal(null)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shadow-inner">
                          <ClipboardList className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Riwayat Service</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-mono">{databarangServiceModal.unitCode}</p>
                        </div>
                      </div>

                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        const t = e.target as typeof e.target & {
                          service_date: { value: string };
                          description: { value: string };
                          location: { value: string };
                          cost: { value: string };
                        };
                        const { error } = await supabase.from('unit_service_history').insert({
                          unit_id: databarangServiceModal.unitId,
                          service_date: t.service_date.value,
                          description: t.description.value.trim(),
                          location: t.location.value.trim() || null,
                          cost: parseInt(t.cost.value.replace(/[^0-9]/g, '')) || 0,
                        });
                        if (error) { toast.error(error.message); return; }
                        toast.success('Service history added');
                        const { data } = await supabase.from('unit_service_history')
                          .select('*').eq('unit_id', databarangServiceModal.unitId).order('service_date', { ascending: false });
                        setDatabarangServiceList(prev => ({ ...prev, [databarangServiceModal.unitId]: data || [] }));
                        (e.target as HTMLFormElement).reset();
                      }} className="space-y-4 mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Tambah Service Baru</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Tanggal Service *</label>
                            <input type="date" name="service_date" required defaultValue={new Date().toISOString().split('T')[0]}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-red-500 text-slate-900 dark:text-white" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Biaya (Rp)</label>
                            <input type="text" name="cost" placeholder="0" onChange={e => {
                              const v = e.target.value.replace(/[^0-9]/g, '');
                              e.target.value = v ? parseInt(v).toLocaleString('id-ID') : '';
                            }} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-red-500 text-slate-900 dark:text-white" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Deskripsi</label>
                          <input type="text" name="description" placeholder="Misal: Ganti oli, perbaikan mesin" required
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-red-500 text-slate-900 dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Lokasi (Opsional)</label>
                          <input type="text" name="location" placeholder="Misal: Bengkel ABC"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-red-500 text-slate-900 dark:text-white" />
                        </div>
                        <button type="submit" className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition flex items-center gap-2">
                          <Plus className="w-4 h-4" /> Tambah Service
                        </button>
                      </form>

                      {/* Service History List */}
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Riwayat</p>
                        {(databarangServiceList[databarangServiceModal.unitId] || []).length === 0 ? (
                          <p className="text-sm text-slate-500 text-center py-4">Belum ada riwayat service.</p>
                        ) : (
                          (databarangServiceList[databarangServiceModal.unitId] || []).map((svc: any) => (
                            <div key={svc.id} className="flex items-start justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                              <div>
                                <div className="text-sm font-semibold text-slate-900 dark:text-white">{svc.description}</div>
                                <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                                  <span>{formatDate(svc.service_date)}</span>
                                  {svc.location && <span>📍 {svc.location}</span>}
                                  {svc.cost > 0 && <span className="text-amber-600 dark:text-amber-400 font-medium">{formatRupiah(svc.cost)}</span>}
                                </div>
                              </div>
                              <button onClick={async () => {
                                await supabase.from('unit_service_history').delete().eq('id', svc.id);
                                const { data } = await supabase.from('unit_service_history')
                                  .select('*').eq('unit_id', databarangServiceModal.unitId).order('service_date', { ascending: false });
                                setDatabarangServiceList(prev => ({ ...prev, [databarangServiceModal.unitId]: data || [] }));
                              }} className="text-red-400 hover:text-red-600 p-1 shrink-0">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            
            {/* === PACKAGES TAB === */}
            {tab === 'packages' && (
              <div className="animate-fade-in space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Menu Paket</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Daftar paket alat dan barang</p>
                  </div>
                  {canModify && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input ref={pkgImportRef} type="file" accept=".xlsx" onChange={handlePkgImport} className="hidden" />
                      <button onClick={() => downloadCatalogTemplate()} title="Unduh template Excel"
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition text-sm justify-center">
                        <FileSpreadsheet className="w-4 h-4" /> Template
                      </button>
                      <button onClick={() => pkgImportRef.current?.click()} title="Impor paket dari Excel"
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition text-sm justify-center">
                        <FileSpreadsheet className="w-4 h-4" /> Import
                      </button>
                      <button onClick={() => {
                        setPackageModalData({ name: '', description: '', base_price: '', items: [] });
                        setPackageModalOpen(true);
                      }} className="flex items-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-600 text-white font-semibold rounded-xl transition text-sm shadow-md shadow-red-500/20 justify-center">
                        <Plus className="w-4 h-4" /> Tambah Paket
                      </button>
                    </div>
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

            {/* === STAFF TAB === */}
            {tab === 'staff' && (
              <div className="animate-fade-in space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Daftar Karyawan</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Kelola data profil karyawan</p>
                  </div>
                  {userRole === 'owner' && (
                    <button onClick={() => {
                      setStaffModalData({ email: '', role: 'staff' });
                      setStaffModalOpen(true);
                    }} className="flex items-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-600 text-white font-semibold rounded-xl transition text-sm shadow-md shadow-red-500/20 w-full sm:w-auto justify-center">
                      <Plus className="w-4 h-4" /> Tambah Karyawan
                    </button>
                  )}
                </div>
                <div className="mb-4">
                  <div className="relative w-full max-w-sm">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={staffSearchQuery} onChange={e => setStaffSearchQuery(e.target.value)} placeholder="Cari karyawan..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-red-600 transition" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staffList.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
                      <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-500 dark:text-slate-400">Belum ada data karyawan.</p>
                    </div>
                  ) : (
                    staffList.filter(staff => {
                      const sNick = staff.full_name || staffNicknames[staff.email] || '';
                      const query = staffSearchQuery.toLowerCase();
                      return staff.email.toLowerCase().includes(query) || staff.role.toLowerCase().includes(query) || sNick.toLowerCase().includes(query);
                    }).map(staff => {
                      const sNick = staff.full_name || staffNicknames[staff.email] || '';
                      
                      const staffActiveJobs = activeJobs.filter(job => job.job_staff?.some((js: any) => js.profile_id === staff.id));
                      
                      return (
                      <div key={staff.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-5 relative group flex flex-col h-full">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-lg shrink-0">
                            {(sNick || staff.email || '?')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-900 dark:text-white truncate">{sNick || staff.email || 'Tanpa Email'}</div>
                            <div className="text-xs text-slate-500 truncate">{sNick ? staff.email : ''}</div>
                          </div>
                        </div>
                        {staffActiveJobs.length > 0 && (
                          <div className="mb-4 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-2 rounded-lg">
                            <div className="flex items-center gap-1 font-semibold mb-1"><Activity className="w-3 h-3" /> Job Aktif:</div>
                            <ul className="list-disc list-inside">
                              {staffActiveJobs.map(j => (
                                <li key={j.id} className="truncate">{j.client_name}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="mt-auto">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="text-xs font-medium px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                              {staff.role}
                            </div>
                            <button onClick={async () => {
                              setStaffHistoryData({ id: staff.id, name: sNick || staff.email });
                              setStaffHistoryJobs([]);
                              setStaffHistoryLoading(true);
                              setStaffHistoryModalOpen(true);
                              const { data } = await supabase.from('jobs')
                                .select('id, client_name, job_date, setup_date, status, job_staff!inner(profile_id)')
                                .eq('job_staff.profile_id', staff.id)
                                .order('job_date', { ascending: false });
                              setStaffHistoryJobs(data || []);
                              setStaffHistoryLoading(false);
                            }} className="p-1.5 text-slate-400 hover:text-blue-500 bg-slate-50 dark:bg-slate-800 rounded-md transition-colors" title="Lihat Riwayat Job">
                              <History className="w-4 h-4" />
                            </button>
                          </div>
                          {userRole === 'owner' && (
                            <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition">
                              <button onClick={() => {
                                const nMap = JSON.parse(localStorage.getItem('bsb_staff_nicknames') || '{}');
                                setStaffModalData({ id: staff.id, email: staff.email || '', role: staff.role || 'staff', nickname: staff.full_name || nMap[staff.email] || '' });
                                setStaffModalOpen(true);
                              }} className="p-1.5 text-slate-400 hover:text-blue-500 bg-slate-50 dark:bg-slate-800 rounded-md">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => {
                                setConfirmModalConfig({
                                  title: 'Hapus Karyawan',
                                  message: `Apakah Anda yakin ingin menghapus karyawan "${staff.email}"? Ini hanya akan menghapus profil mereka dari database.`,
                                  onConfirm: () => {
                                    supabase.from('profiles').delete().eq('id', staff.id).then(({ error }) => {
                                      if (error) {
                                        toast.error("Gagal menghapus karyawan: " + error.message);
                                      } else {
                                        toast.success("Data karyawan dihapus");
                                        loadData();
                                      }
                                      setConfirmModalOpen(false);
                                    });
                                  }
                                });
                                setConfirmModalOpen(true);
                              }} className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-slate-800 rounded-md">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        </div>
                      </div>
                    );
                  })
                )}
                </div>
              </div>
            )}

            {/* === SUPER ADMIN: CASHFLOW TAB === */}
            {tab === 'cashflow' && userRole === 'owner' && (
              <div className="animate-fade-in h-full flex flex-col space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Aliran Kas (Cashflow Web App)</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Live preview & kontrol penuh aplikasi pembukuan utama.</p>
                  </div>
                  <a href="https://cashflow.beragamsewabali.com" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition text-sm shadow-md shadow-emerald-500/20 w-full sm:w-auto justify-center">
                    <ExternalLink className="w-4 h-4" /> Buka Tab Baru
                  </a>
                </div>

                <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-[2rem] overflow-hidden min-h-[500px]">
                  <div className="flex items-center gap-4 px-6 py-3.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="w-3 h-3 rounded-full bg-rose-400 block" />
                      <span className="w-3 h-3 rounded-full bg-amber-400 block" />
                      <span className="w-3 h-3 rounded-full bg-emerald-400 block" />
                    </div>
                    <div className="flex-1 flex items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl px-4 py-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <div className="flex items-center gap-2 truncate">
                        <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">https://cashflow.beragamsewabali.com</span>
                      </div>
                      <button onClick={() => {
                        navigator.clipboard.writeText('https://cashflow.beragamsewabali.com');
                        toast.success('URL disalin ke papan klip!');
                      }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 transition">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 relative bg-slate-50 dark:bg-slate-950">
                    <iframe 
                      src="https://cashflow.beragamsewabali.com" 
                      className="w-full h-full border-0 absolute inset-0"
                      title="BSB Cashflow Live Preview"
                      allow="clipboard-read; clipboard-write; display-capture"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* === SUPER ADMIN: SUPPLIERS TAB === */}
            {tab === 'suppliers' && userRole === 'owner' && (
              <div className="animate-fade-in space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Daftar Suppliers & Vendor</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Daftar supplier penyedia logistik dan sub-rent alat event.</p>
                  </div>
                  <button onClick={() => {
                    setSupplierModalData({ name: '', contact_name: '', phone: '', email: '' });
                    setSupplierModalOpen(true);
                  }} className="flex items-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-600 text-white font-semibold rounded-xl transition text-sm shadow-md shadow-red-500/20 w-full sm:w-auto justify-center">
                    <Plus className="w-4 h-4" /> Tambah Supplier
                  </button>
                </div>

                <div className="mb-4">
                  <div className="relative w-full max-w-sm">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={supplierSearchQuery} onChange={e => setSupplierSearchQuery(e.target.value)} placeholder="Cari supplier..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-red-600 transition" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suppliersList.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
                      <Truck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-500 dark:text-slate-400">Belum ada data supplier / vendor.</p>
                    </div>
                  ) : (
                    suppliersList.filter(sup => sup.name.toLowerCase().includes(supplierSearchQuery.toLowerCase()) || sup.contact_name?.toLowerCase().includes(supplierSearchQuery.toLowerCase())).map(sup => {
                      const supActiveJobs = activeJobs.filter(job => job.job_items?.some((ji: any) => ji.source_vendor_id === sup.id));
                      
                      return (
                      <div key={sup.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-5 relative group flex flex-col h-full">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                            <Truck className="w-6 h-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-900 dark:text-white truncate">{sup.name}</div>
                            <div className="text-xs text-slate-500 truncate">{sup.contact_name || 'Kontak Utama'}</div>
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 space-y-1 mb-4">
                          <div>Telp: {sup.phone || '-'}</div>
                          <div>Email: {sup.email || '-'}</div>
                        </div>
                        {supActiveJobs.length > 0 && (
                          <div className="mb-4 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-2 rounded-lg">
                            <div className="flex items-center gap-1 font-semibold mb-1"><Activity className="w-3 h-3" /> Supply Job Aktif:</div>
                            <ul className="list-disc list-inside">
                              {supActiveJobs.map(j => (
                                <li key={j.id} className="truncate">{j.client_name}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="flex justify-end gap-1 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                          <button onClick={() => {
                            setActiveSupplierForItems({ id: sup.id, name: sup.name });
                            setSupplierItemsOpen(true);
                          }} className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-red-600 bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                            <Package className="w-3.5 h-3.5" /> Barang
                          </button>
                          <button onClick={() => {
                            setSupplierModalData({ id: sup.id, name: sup.name, contact_name: sup.contact_name || '', phone: sup.phone || '', email: sup.email || '' });
                            setSupplierModalOpen(true);
                          }} className="p-1.5 text-slate-400 hover:text-blue-500 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => {
                            setConfirmModalConfig({
                              title: 'Hapus Supplier',
                              message: `Apakah Anda yakin ingin menghapus supplier "${sup.name}"? Ini juga akan menghapus kaitan barang dari supplier ini.`,
                              onConfirm: async () => {
                                await supabase.from('suppliers').update({ is_deleted: true }).eq('id', sup.id);
                                loadData(true);
                                setConfirmModalOpen(false);
                              }
                            });
                            setConfirmModalOpen(true);
                          }} className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* === SUPER ADMIN: LANDING PAGE CONTENT TAB === */}
            {tab === 'landing' && userRole === 'owner' && (
              <div className="animate-fade-in h-full flex flex-col space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Admin Panel (Landing Page)</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Live preview & kontrol penuh konten landing page publik.</p>
                  </div>
                  <a href="/admin/index.html" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-600 text-white font-semibold rounded-xl transition text-sm shadow-md shadow-red-500/20 w-full sm:w-auto justify-center">
                    <ExternalLink className="w-4 h-4" /> Buka Tab Baru
                  </a>
                </div>

                <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-[2rem] overflow-hidden min-h-[500px]">
                  <div className="flex items-center gap-4 px-6 py-3.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="w-3 h-3 rounded-full bg-rose-400 block" />
                      <span className="w-3 h-3 rounded-full bg-amber-400 block" />
                      <span className="w-3 h-3 rounded-full bg-emerald-400 block" />
                    </div>
                    <div className="flex-1 flex items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl px-4 py-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <div className="flex items-center gap-2 truncate">
                        <Lock className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="truncate">Internal Admin Module</span>
                      </div>
                      <button onClick={() => {
                        navigator.clipboard.writeText(window.location.origin + '/admin/index.html');
                        toast.success('URL disalin ke papan klip!');
                      }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 transition">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 relative bg-slate-50 dark:bg-slate-950">
                    <iframe 
                      src="/admin/index.html" 
                      className="w-full h-full border-0 absolute inset-0"
                      title="BSB Admin Panel Live Preview"
                      allow="clipboard-read; clipboard-write; display-capture"
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <PackageModal
        isOpen={packageModalOpen}
        data={packageModalData}
        itemsList={itemsList}
        onClose={() => setPackageModalOpen(false)}
        onSaved={() => loadData(true)}
      />

      <SupplierItemsModal
        isOpen={supplierItemsOpen}
        supplier={activeSupplierForItems}
        onClose={() => {
          setSupplierItemsOpen(false);
          setActiveSupplierForItems(null);
        }}
      />

      {showJobForm && (
        <JobFormModal
          job={editingJob}
          onClose={() => { setShowJobForm(false); setEditingJob(null); }}
          onSaved={() => { setShowJobForm(false); setEditingJob(null); loadData(); }}
        />
      )}
      {viewingJobId && (
        <JobDetailModal
          jobId={viewingJobId}
          userRole={userRole}
          currentUserId={currentUserId}
          onClose={() => setViewingJobId(null)}
          onStatusChange={(id, status) => { handleStatusChange(id, status); }}
        />
      )}

      {/* Sparepart Add/Edit Modal */}
      {sparepartModalOpen && sparepartModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-[2rem] p-4 sm:p-8 w-full max-w-lg relative animate-slide-up">
            <button onClick={() => setSparepartModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shadow-inner">
                <Wrench className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {sparepartModalData.id ? 'Edit Sparepart' : 'Tambah Sparepart Baru'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Lengkapi informasi sparepart.</p>
              </div>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const target = e.target as typeof e.target & { name: { value: string }; sku: { value: string }; category: { value: string } };
              
              let finalCategory = sparepartModalData.category || 'umum';
              if (showNewSparepartCategoryInput && newSparepartCategoryName.trim()) {
                finalCategory = newSparepartCategoryName.trim().toLowerCase();
                if (!sparepartsCategoryList.includes(finalCategory)) {
                  const updated = [...sparepartsCategoryListState, finalCategory];
                  setSparepartsCategoryListState(updated);
                  localStorage.setItem('bsb_custom_sparepart_categories', JSON.stringify(updated));
                }
              }

              const payload = {
                name: target.name.value.trim(),
                sku: target.sku.value.trim() || `SP-${Date.now()}`,
                category: finalCategory,
              };
              try {
                if (sparepartModalData.id) {
                  const { error } = await supabase.from('spareparts').update(payload).eq('id', sparepartModalData.id);
                  if (error) throw error;
                  toast.success('Sparepart berhasil diupdate');
                } else {
                  const { error } = await supabase.from('spareparts').insert({ ...payload, quantity: 0 });
                  if (error) throw error;
                  toast.success('Sparepart berhasil ditambahkan');
                }
                loadData(true);
                setSparepartModalOpen(false);
                setShowNewSparepartCategoryInput(false);
                setNewSparepartCategoryName('');
              } catch (err) { toast.error((err as Error).message); }
            }} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nama Sparepart <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Wrench className="h-5 w-5 text-slate-400" />
                  </div>
                  <input type="text" name="name" defaultValue={sparepartModalData.name} required placeholder="Contoh: Ban Genset 5kW"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">SKU / Kode</label>
                  <input type="text" name="sku" value={sparepartModalData.sku} onChange={e => setSparepartModalData({...sparepartModalData, sku: e.target.value.toUpperCase()})} required placeholder="SP-1234"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Kategori</label>
                    <button type="button" onClick={() => {
                      setNewSparepartCategoryName('');
                      setShowNewSparepartCategoryInput(!showNewSparepartCategoryInput);
                    }} className="text-xs text-red-600 dark:text-red-400 font-bold hover:underline flex items-center gap-1">
                      {showNewSparepartCategoryInput ? 'Batal Tambah' : <><Plus className="w-3.5 h-3.5" /> Kategori Baru</>}
                    </button>
                  </div>
                  
                  {showNewSparepartCategoryInput && (
                    <div className="flex items-center gap-2 mb-3 bg-red-50 dark:bg-red-500/10 p-2 rounded-xl border border-red-100 dark:border-red-500/20">
                      <input 
                        type="text" 
                        value={newSparepartCategoryName} 
                        onChange={e => setNewSparepartCategoryName(e.target.value)} 
                        placeholder="Ketik kategori..." 
                        className="flex-1 px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-red-500 text-slate-900 dark:text-white"
                      />
                      <button 
                        type="button" 
                        onClick={() => {
                          if (newSparepartCategoryName && newSparepartCategoryName.trim()) {
                            const trimmed = newSparepartCategoryName.trim().toLowerCase();
                            if (!sparepartsCategoryList.includes(trimmed)) {
                              const updated = [...sparepartsCategoryListState, trimmed];
                              setSparepartsCategoryListState(updated);
                              localStorage.setItem('bsb_custom_sparepart_categories', JSON.stringify(updated));
                            }
                            setSparepartModalData({
                              ...sparepartModalData, 
                              category: trimmed,
                            });
                            setShowNewSparepartCategoryInput(false);
                            setNewSparepartCategoryName('');
                          }
                        }}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors"
                      >Simpan</button>
                    </div>
                  )}

                  <select name="category" value={sparepartModalData.category} onChange={e => {
                      setSparepartModalData({
                        ...sparepartModalData, 
                        category: e.target.value,
                      });
                    }}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium appearance-none">
                    {sparepartsCategoryList.map(cat => (
                      <option key={cat} value={cat} className="capitalize">{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-6 border-t border-slate-100 dark:border-slate-800 mt-2">
                <button type="button" onClick={() => { setSparepartModalOpen(false); setShowNewSparepartCategoryInput(false); }} className="px-6 py-2.5 text-sm font-bold rounded-xl text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Batal</button>
                <button type="submit" onClick={() => setShowNewSparepartCategoryInput(false)} className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-red-500/25 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sparepart Purchase Modal */}
      {sparepartPurchaseModalOpen && sparepartPurchaseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-[2rem] p-4 sm:p-8 w-full max-w-lg relative animate-slide-up">
            <button onClick={() => setSparepartPurchaseModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shadow-inner">
                <ShoppingCart className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Catat Pembelian</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{sparepartPurchaseTarget.name}</p>
              </div>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const target = e.target as typeof e.target & {
                purchase_date: { value: string }; quantity: { value: string }; unit_price: { value: string }; notes: { value: string };
              };
              const qty = parseInt(target.quantity.value) || 1;
              const price = parseFloat(target.unit_price.value.replace(/[^0-9]/g, '')) || 0;
              try {
                const { error: purchaseErr } = await supabase.from('sparepart_purchases').insert({
                  sparepart_id: sparepartPurchaseTarget.id,
                  purchase_date: target.purchase_date.value,
                  quantity: qty,
                  unit_price: price,
                  notes: target.notes.value.trim() || null,
                });
                if (purchaseErr) throw purchaseErr;
                const { error: stockErr } = await supabase.from('spareparts').update({
                  quantity: (sparepartPurchaseTarget.quantity || 0) + qty,
                  updated_at: new Date().toISOString(),
                }).eq('id', sparepartPurchaseTarget.id);
                if (stockErr) throw stockErr;
                toast.success(`+${qty} stok ditambahkan ke ${sparepartPurchaseTarget.name}`);
                loadData(true);
                setSparepartPurchaseModalOpen(false);
              } catch (err) { toast.error((err as Error).message); }
            }} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tanggal Beli <span className="text-red-500">*</span></label>
                <input type="date" name="purchase_date" required defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Jumlah <span className="text-red-500">*</span></label>
                  <input type="number" name="quantity" required min="1" defaultValue={1}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Harga Satuan (Rp) <span className="text-red-500">*</span></label>
                  <input type="text" name="unit_price" required placeholder="150.000"
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      e.target.value = value ? parseInt(value, 10).toLocaleString('id-ID') : '';
                    }}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Catatan</label>
                <input type="text" name="notes" placeholder="Opsional: Beli di toko X"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium" />
              </div>
              <div className="flex gap-3 justify-end pt-6 border-t border-slate-100 dark:border-slate-800 mt-2">
                <button type="button" onClick={() => setSparepartPurchaseModalOpen(false)} className="px-6 py-2.5 text-sm font-bold rounded-xl text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Batal</button>
                <button type="submit" className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" /> Catat Pembelian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sparepart Purchase History Modal */}
      {sparepartHistoryOpen && sparepartHistoryTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-[2rem] p-8 w-full max-w-2xl relative animate-slide-up flex flex-col max-h-[90vh]">
            <button onClick={() => setSparepartHistoryOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4 mb-6 shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shadow-inner">
                <History className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Riwayat Pembelian</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{sparepartHistoryTarget.name} — Stok saat ini: <span className="font-bold text-emerald-600">{sparepartHistoryTarget.quantity || 0}</span></p>
              </div>
            </div>
            <SparepartPurchaseHistory sparepartId={sparepartHistoryTarget.id} canModify={canModify} onUpdate={() => loadData(true)} />
          </div>
        </div>
      )}

      {/* Sparepart Category Manager Modal */}
      {sparepartCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-[2rem] p-8 w-full max-w-lg relative animate-slide-up flex flex-col max-h-[90vh]">
            <button onClick={() => setSparepartCategoryModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-4 mb-6 shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-inner">
                <Filter className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Kelola Kategori Sparepart</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Tambah, ubah nama, atau hapus kategori</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mb-6 pr-2 space-y-3">
              {sparepartsCategoryList.map(cat => (
                <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl group">
                  <span className="font-medium text-slate-900 dark:text-white capitalize">{cat}</span>
                  <div className="flex gap-2">
                    <button onClick={async () => {
                      const newName = await showPrompt(`Ubah nama kategori "${cat}" menjadi:`, cat);
                      if (newName && newName.trim() && newName.trim().toLowerCase() !== cat) {
                        const trimmed = newName.trim().toLowerCase();
                        try {
                          await supabase.from('spareparts').update({ category: trimmed }).eq('category', cat);
                          
                          const updated = sparepartsCategoryListState.filter(c => c !== cat);
                          if (!updated.includes(trimmed)) updated.push(trimmed);
                          setSparepartsCategoryListState(updated);
                          localStorage.setItem('bsb_custom_sparepart_categories', JSON.stringify(updated));
                          
                          loadData(true);
                          toast.success(`Kategori berhasil diubah menjadi ${trimmed}`);
                        } catch (err: any) {
                          toast.error('Gagal mengubah kategori: ' + err.message);
                        }
                      }
                    }} className="p-1.5 text-slate-400 hover:text-blue-500 bg-white dark:bg-slate-800 shadow-sm rounded-lg border border-slate-200 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={async () => {
                      if (await showConfirm(`Yakin ingin menghapus kategori "${cat}"?\nBarang dengan kategori ini akan dipindah ke kategori "umum".`)) {
                        try {
                          await supabase.from('spareparts').update({ category: 'umum' }).eq('category', cat);
                          
                          const updated = sparepartsCategoryListState.filter(c => c !== cat);
                          setSparepartsCategoryListState(updated);
                          localStorage.setItem('bsb_custom_sparepart_categories', JSON.stringify(updated));
                          
                          loadData(true);
                          toast.success('Kategori berhasil dihapus');
                        } catch (err: any) {
                          toast.error('Gagal menghapus kategori: ' + err.message);
                        }
                      }
                    }} className="p-1.5 text-slate-400 hover:text-red-500 bg-white dark:bg-slate-800 shadow-sm rounded-lg border border-slate-200 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 pt-4">
              <form onSubmit={e => {
                e.preventDefault();
                const target = e.target as typeof e.target & { catName: { value: string } };
                const name = target.catName.value.trim().toLowerCase();
                if (name && !sparepartsCategoryList.includes(name)) {
                  const updated = [...sparepartsCategoryListState, name];
                  setSparepartsCategoryListState(updated);
                  localStorage.setItem('bsb_custom_sparepart_categories', JSON.stringify(updated));
                  target.catName.value = '';
                  toast.success('Kategori baru ditambahkan');
                }
              }} className="flex gap-2">
                <input type="text" name="catName" required placeholder="Tambah kategori baru..." 
                  className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-red-500" />
                <button type="submit" className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-sm font-bold transition flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Tambah
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Item Add/Edit Modal */}
      {itemModalOpen && itemModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-[2rem] p-8 w-full max-w-lg relative animate-slide-up">
            <button onClick={() => setItemModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center shadow-inner">
                <Package className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {itemModalData.id ? 'Edit Barang' : 'Tambah Barang Baru'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Lengkapi informasi inventaris di bawah ini.</p>
              </div>
            </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const target = e.target as typeof e.target & {
                  name: { value: string };
                  quantity: { value: string };
                  sku: { value: string };
                };
                let finalCategory = itemModalData.category || 'other';
                if (showNewCategoryInput && newCategoryName.trim()) {
                  finalCategory = newCategoryName.trim().toLowerCase();
                  if (!categoriesList.includes(finalCategory)) {
                    const updated = [...customCategories, finalCategory];
                    setCustomCategories(updated);
                    localStorage.setItem('bsb_custom_categories', JSON.stringify(updated));
                  }
                }

                const payload = {
                  name: target.name.value.trim(),
                  category: finalCategory,
                  quantity: parseInt(target.quantity.value) || 1,
                  sku: target.sku.value.trim() || `SKU-${Date.now()}`
                };
                try {
                  if (itemModalData.id) {
                    const { error } = await supabase.from('items').update(payload).eq('id', itemModalData.id);
                    if (error) throw error;
                  } else {
                    const { error } = await supabase.from('items').insert(payload);
                    if (error) throw error;
                  }
                  loadData(true);
                  setItemModalOpen(false);
                } catch (err) {
                  toast.error((err as Error).message);
                }
              }} className="space-y-6">
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nama Barang <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Package className="h-5 w-5 text-slate-400" />
                  </div>
                  <input type="text" name="name" defaultValue={itemModalData.name} required placeholder="Contoh: Sound System 1000W" 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">SKU / Kode Barang</label>
                  <input type="text" name="sku" value={itemModalData.sku} onChange={e => setItemModalData({...itemModalData, sku: e.target.value.toUpperCase()})} required placeholder="Contoh: LG-1234" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Stok</label>
                  <input type="number" name="quantity" defaultValue={itemModalData.quantity} required min="1" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium" />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Kategori</label>
                  <button type="button" onClick={() => {
                    setNewCategoryName('');
                    setShowNewCategoryInput(!showNewCategoryInput);
                  }} className="text-xs text-red-600 dark:text-red-400 font-bold hover:underline flex items-center gap-1">
                    {showNewCategoryInput ? 'Batal Tambah' : <><Plus className="w-3.5 h-3.5" /> Tambah Kategori</>}
                  </button>
                </div>
                
                {showNewCategoryInput && (
                  <div className="flex items-center gap-2 mb-3 bg-red-50 dark:bg-red-500/10 p-3 rounded-xl border border-red-100 dark:border-red-500/20">
                    <input 
                      type="text" 
                      value={newCategoryName} 
                      onChange={e => setNewCategoryName(e.target.value)} 
                      placeholder="Ketik nama kategori..." 
                      className="flex-1 px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-red-500 text-slate-900 dark:text-white"
                    />
                    <button 
                      type="button" 
                      onClick={() => {
                        if (newCategoryName && newCategoryName.trim()) {
                          const trimmed = newCategoryName.trim().toLowerCase();
                          if (!categoriesList.includes(trimmed)) {
                            const updated = [...customCategories, trimmed];
                            setCustomCategories(updated);
                            localStorage.setItem('bsb_custom_categories', JSON.stringify(updated));
                          }
                          setItemModalData({
                            ...itemModalData, 
                            category: trimmed,
                            ...(!itemModalData.id ? { sku: generateSkuForCategory(trimmed) } : {})
                          });
                          setShowNewCategoryInput(false);
                          setNewCategoryName('');
                        }
                      }}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors"
                    >Simpan</button>
                  </div>
                )}
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Filter className="h-5 w-5 text-slate-400" />
                  </div>
                  <select name="category" value={itemModalData.category} onChange={e => {
                      const newCat = e.target.value;
                      setItemModalData({
                        ...itemModalData, 
                        category: newCat,
                        ...(!itemModalData.id ? { sku: generateSkuForCategory(newCat) } : {})
                      });
                    }}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium appearance-none">
                    {categoriesList.map(cat => (
                      <option key={cat} value={cat} className="capitalize">{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-6 border-t border-slate-100 dark:border-slate-800 mt-2">
                <button type="button" onClick={() => { setItemModalOpen(false); setShowNewCategoryInput(false); }} className="px-6 py-2.5 text-sm font-bold rounded-xl text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  Batal
                </button>
                <button type="submit" onClick={() => setShowNewCategoryInput(false)} className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-[2rem] p-8 w-full max-w-lg relative animate-slide-up flex flex-col max-h-[90vh]">
            <button onClick={() => setCategoryModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-4 mb-6 shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-inner">
                <Filter className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Kelola Kategori</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Tambah, ubah nama, atau hapus kategori</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mb-6 pr-2 space-y-3">
              {categoriesList.map(cat => (
                <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl group">
                  <span className="font-medium text-slate-900 dark:text-white capitalize">{cat}</span>
                  <div className="flex gap-2">
                    <button onClick={async () => {
                      const newName = await showPrompt(`Ubah nama kategori "${cat}" menjadi:`, cat);
                      if (newName && newName.trim() && newName.trim().toLowerCase() !== cat) {
                        const trimmed = newName.trim().toLowerCase();
                        try {
                          // Update all items with this category to the new name
                          await supabase.from('items').update({ category: trimmed }).eq('category', cat);
                          
                          // Update custom categories list
                          const updated = customCategories.filter(c => c !== cat);
                          if (!updated.includes(trimmed)) updated.push(trimmed);
                          setCustomCategories(updated);
                          localStorage.setItem('bsb_custom_categories', JSON.stringify(updated));
                          
                          loadData(true);
                          toast.success(`Kategori berhasil diubah menjadi ${trimmed}`);
                        } catch (err: any) {
                          toast.error('Gagal mengubah kategori: ' + err.message);
                        }
                      }
                    }} className="p-1.5 text-slate-400 hover:text-blue-500 bg-white dark:bg-slate-800 shadow-sm rounded-lg border border-slate-200 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {cat !== 'other' && (
                      <button onClick={async () => {
                        if (await showConfirm(`Hapus kategori "${cat}"? Semua barang dalam kategori ini akan diubah menjadi "other".`)) {
                          try {
                            await supabase.from('items').update({ category: 'other' }).eq('category', cat);
                            const updated = customCategories.filter(c => c !== cat);
                            setCustomCategories(updated);
                            localStorage.setItem('bsb_custom_categories', JSON.stringify(updated));
                            loadData(true);
                            toast.success(`Kategori "${cat}" berhasil dihapus.`);
                          } catch (err: any) {
                            toast.error('Gagal menghapus kategori: ' + err.message);
                          }
                        }
                      }} className="p-1.5 text-slate-400 hover:text-red-500 bg-white dark:bg-slate-800 shadow-sm rounded-lg border border-slate-200 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 pt-4">
              <form onSubmit={(e) => {
                e.preventDefault();
                const target = e.target as typeof e.target & { new_cat: { value: string } };
                const newCat = target.new_cat.value.trim().toLowerCase();
                if (newCat && !categoriesList.includes(newCat)) {
                  const updated = [...customCategories, newCat];
                  setCustomCategories(updated);
                  localStorage.setItem('bsb_custom_categories', JSON.stringify(updated));
                  target.new_cat.value = '';
                  toast.success('Kategori ditambahkan');
                }
              }} className="flex gap-2">
                <input type="text" name="new_cat" placeholder="Kategori baru..." required
                  className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-red-500" />
                <button type="submit" className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-sm font-bold transition flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Tambah
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Cashflow Add/Edit Modal */}
      {cashflowModalOpen && cashflowModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-[2rem] p-8 w-full max-w-lg relative animate-slide-up">
            <button onClick={() => setCashflowModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center shadow-inner">
                <Wallet className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {cashflowModalData.id ? 'Edit Transaksi' : 'Tambah Transaksi Cashflow'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Catat kas masuk atau keluar sistem.</p>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const target = e.target as typeof e.target & {
                type: { value: 'inflow' | 'outflow' };
                category: { value: string };
                amount: { value: string };
                description: { value: string };
                transaction_date: { value: string };
              };
              const payload = {
                type: target.type.value,
                category: target.category.value,
                amount: parseFloat(target.amount.value) || 0,
                description: target.description.value.trim(),
                transaction_date: target.transaction_date.value ? new Date(target.transaction_date.value).toISOString() : new Date().toISOString(),
                created_by: currentUserId || null
              };
              try {
                if (cashflowModalData.id) {
                  await supabase.from('cashflow').update(payload).eq('id', cashflowModalData.id);
                } else {
                  await supabase.from('cashflow').insert(payload);
                }
                loadData(true);
                setCashflowModalOpen(false);
              } catch (err) {
                toast.error((err as Error).message);
              }
            }} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tipe</label>
                  <select name="type" defaultValue={cashflowModalData.type}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium appearance-none cursor-pointer">
                    <option value="inflow">Kas Masuk (Inflow)</option>
                    <option value="outflow">Kas Keluar (Outflow)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Kategori</label>
                  <select name="category" defaultValue={cashflowModalData.category}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium appearance-none cursor-pointer">
                    <option value="client_rental">Sewa Client (Client Rental)</option>
                    <option value="operational_expense">Biaya Operasional</option>
                    <option value="payroll">Gaji Kru / Karyawan (Payroll)</option>
                    <option value="supplier_payment">Pembayaran Supplier</option>
                    <option value="maintenance_cost">Biaya Maintenance / Perbaikan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Jumlah (IDR) <span className="text-red-500">*</span></label>
                  <input type="number" name="amount" defaultValue={cashflowModalData.amount || ''} required min="1" placeholder="Jumlah nominal"
                    onChange={(e) => { const el = document.getElementById('cf-amount-display'); if(el) el.innerText = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(parseInt(e.target.value) || 0) }}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium" />
                  <div id="cf-amount-display" className="text-xs text-red-500 mt-1">{cashflowModalData.amount ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(cashflowModalData.amount) : ''}</div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Waktu Transaksi</label>
                  <input type="datetime-local" name="transaction_date" defaultValue={cashflowModalData.transaction_date} required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Keterangan / Memo</label>
                <input type="text" name="description" defaultValue={cashflowModalData.description} placeholder="Memo deskripsi transaksi"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium" />
              </div>

              <div className="flex gap-3 justify-end pt-6 border-t border-slate-100 dark:border-slate-800 mt-2">
                <button type="button" onClick={() => setCashflowModalOpen(false)} className="px-6 py-2.5 text-sm font-bold rounded-xl text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  Batal
                </button>
                <button type="submit" className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Add/Edit Modal */}
      {supplierModalOpen && supplierModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-[2rem] p-8 w-full max-w-lg relative animate-slide-up">
            <button onClick={() => setSupplierModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center shadow-inner">
                <Truck className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {supplierModalData.id ? 'Edit Supplier' : 'Tambah Supplier Baru'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Lengkapi informasi supplier penyedia.</p>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const target = e.target as typeof e.target & {
                name: { value: string };
                contact_name: { value: string };
                phone: { value: string };
                email: { value: string };
              };
              const payload = {
                name: target.name.value.trim(),
                contact_name: target.contact_name.value.trim() || null,
                phone: target.phone.value.trim() || null,
                email: target.email.value.trim() || null
              };
              try {
                if (supplierModalData.id) {
                  await supabase.from('suppliers').update(payload).eq('id', supplierModalData.id);
                } else {
                  await supabase.from('suppliers').insert(payload);
                }
                loadData(true);
                setSupplierModalOpen(false);
              } catch (err) {
                toast.error((err as Error).message);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nama Toko / Perusahaan <span className="text-red-500">*</span></label>
                <input type="text" name="name" defaultValue={supplierModalData.name} required placeholder="Contoh: Budi Rental Sound"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nama Kontak</label>
                <input type="text" name="contact_name" defaultValue={supplierModalData.contact_name} placeholder="Nama PIC utama"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nomor Telepon</label>
                  <input type="text" name="phone" defaultValue={supplierModalData.phone} placeholder="Contoh: 0812345678"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Alamat Email</label>
                  <input type="email" name="email" defaultValue={supplierModalData.email} placeholder="supplier@example.com"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium" />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-6 border-t border-slate-100 dark:border-slate-800 mt-2">
                <button type="button" onClick={() => setSupplierModalOpen(false)} className="px-6 py-2.5 text-sm font-bold rounded-xl text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  Batal
                </button>
                <button type="submit" className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Simpan Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Landing Page Content Add/Edit Modal */}
      {landingModalOpen && landingModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-[2rem] p-8 w-full max-w-lg relative animate-slide-up">
            <button onClick={() => setLandingModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center shadow-inner">
                <Globe className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {landingModalData.id ? 'Edit Konten Web' : 'Tambah Konten Web Baru'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Kelola data dinamis pada halaman Landing Page / Katalog.</p>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const target = e.target as typeof e.target & {
                section_key: { value: string };
                title: { value: string };
                text: { value: string };
                long_text: { value: string };
                image_url: { value: string };
              };
              const payload = {
                section_key: target.section_key.value,
                title: target.title.value.trim() || null,
                text: target.text.value.trim() || null,
                long_text: target.long_text.value.trim() || null,
                image_url: target.image_url.value.trim() || null
              };
              try {
                if (landingModalData.id) {
                  await supabase.from('section_images').update(payload).eq('id', landingModalData.id);
                } else {
                  await supabase.from('section_images').insert(payload);
                }
                loadData(true);
                setLandingModalOpen(false);
              } catch (err) {
                toast.error((err as Error).message);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Kategori Seksi Konten <span className="text-red-500">*</span></label>
                <select name="section_key" defaultValue={landingModalData.section_key}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium appearance-none cursor-pointer">
                  <option value="service">Services (Layanan Utama)</option>
                  <option value="package">Packages (Paket Sewa Promo)</option>
                  <option value="gallery">Gallery (Portofolio Foto Event)</option>
                  <option value="home_slider">Home Slider (Banner Beranda)</option>
                  <option value="about_carousel">About Carousel (Galeri Tentang Kami)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Judul (Title)</label>
                <input type="text" name="title" defaultValue={landingModalData.title} placeholder="Contoh: Paket Custom Wedding"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Subtitle / Deskripsi Singkat</label>
                <input type="text" name="text" defaultValue={landingModalData.text} placeholder="Contoh: Sound system + genset start from..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Deskripsi Detail (Markdown/HTML ready)</label>
                <textarea name="long_text" defaultValue={landingModalData.long_text} placeholder="Tuliskan spesifikasi detail atau daftar item..." rows={3}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium resize-none" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Gambar / Foto (Upload)</label>
                <div className="flex flex-col gap-3">
                  {landingModalData.image_url && (
                    <img src={landingModalData.image_url} alt="Preview" className="w-48 h-32 object-cover rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100" />
                  )}
                  <input type="file" accept="image/*" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsUploadingImage(true);
                    try {
                      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
                      const fileName = `landing/img_${Date.now()}.${ext}`;
                      const { error } = await supabase.storage.from('job-proofs').upload(fileName, file, { upsert: true, contentType: file.type });
                      if (error) throw error;
                      const { data: urlData } = supabase.storage.from('job-proofs').getPublicUrl(fileName);
                      setLandingModalData(prev => prev ? { ...prev, image_url: urlData.publicUrl } : null);
                    } catch (err) {
                      toast.error('Gagal upload gambar: ' + (err as Error).message);
                    } finally {
                      setIsUploadingImage(false);
                    }
                  }} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 dark:file:bg-red-500/10 dark:file:text-red-400 cursor-pointer" disabled={isUploadingImage} />
                  {isUploadingImage && <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold animate-pulse">Mengunggah gambar, mohon tunggu...</p>}
                  <input type="hidden" name="image_url" value={landingModalData.image_url || ''} />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-6 border-t border-slate-100 dark:border-slate-800 mt-2">
                <button type="button" onClick={() => setLandingModalOpen(false)} className="px-6 py-2.5 text-sm font-bold rounded-xl text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  Batal
                </button>
                <button type="submit" className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Simpan Konten
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {staffModalOpen && staffModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-[2rem] p-8 w-full max-w-lg relative animate-slide-up">
            <button onClick={() => setStaffModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shadow-inner">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {staffModalData.id ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Atur hak akses dan username staf.</p>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const target = e.target as typeof e.target & {
                email: { value: string };
                role: { value: string };
                nickname: { value: string };
              };
              const payload = {
                email: target.email.value.trim(),
                role: target.role.value,
                full_name: target.nickname.value.trim()
              };
              try {
                if (staffModalData.id) {
                  await supabase.from('profiles').update(payload).eq('id', staffModalData.id);
                } else {
                  await supabase.from('profiles').insert(payload);
                }
                const newNickname = target.nickname.value.trim();
                const updatedNicknames = { ...staffNicknames, [payload.email]: newNickname };
                setStaffNicknames(updatedNicknames);
                
                await supabase.from('site_content').upsert({
                  content_key: 'bsb_staff_nicknames',
                  content_value: JSON.stringify(updatedNicknames)
                }, { onConflict: 'content_key' });

                loadData();
                setStaffModalOpen(false);
              } catch (err) {
                toast.error((err as Error).message);
              }
            }} className="space-y-6">
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nama Panggilan / Nickname</label>
                <input type="text" name="nickname" defaultValue={staffModalData.nickname} placeholder="Contoh: Budi" 
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Username <span className="text-red-500">*</span></label>
                <input type="text" name="email" defaultValue={staffModalData.email} required placeholder="username_kru" disabled={!!staffModalData.id} 
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Role Hak Akses</label>
                <select name="role" defaultValue={staffModalData.role} 
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-medium appearance-none cursor-pointer">
                  <option value="staff">Staff (Lapangan & Logistik)</option>
                  <option value="accounting">Accounting (Keuangan)</option>
                  <option value="owner">Owner (Pemilik Toko)</option>
                  <option value="guest">Guest (Tamu)</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-6 border-t border-slate-100 dark:border-slate-800 mt-2">
                <button type="button" onClick={() => setStaffModalOpen(false)} className="px-6 py-2.5 text-sm font-bold rounded-xl text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  Batal
                </button>
                <button type="submit" className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Simpan Akses
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff History Modal */}
      {staffHistoryModalOpen && staffHistoryData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-[2rem] p-8 w-full max-w-2xl relative animate-slide-up max-h-[85vh] flex flex-col">
            <button onClick={() => setStaffHistoryModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-4 mb-6 shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shadow-inner">
                <History className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Riwayat Job</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Semua job yang pernah diikuti oleh <span className="font-bold text-slate-700 dark:text-slate-300">{staffHistoryData.name}</span>.</p>
              </div>
            </div>

            <div className="overflow-y-auto pr-2 space-y-3 flex-1">
              {staffHistoryLoading ? (
                <div className="flex items-center justify-center p-8"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
              ) : staffHistoryJobs.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Karyawan ini belum mengikuti job apapun.</p>
              ) : (
                staffHistoryJobs.map(job => (
                  <div key={job.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">{job.client_name}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {new Date(job.job_date || job.setup_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="mt-2 sm:mt-0">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                        job.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                        job.status === 'on_going' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                        'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {job.status === 'completed' ? 'Selesai' : job.status === 'on_going' ? 'Aktif' : job.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmModalOpen && confirmModalConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl p-6 w-full max-w-sm relative animate-slide-up">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{confirmModalConfig.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">{confirmModalConfig.message}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmModalOpen(false)} className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                Batal
              </button>
              <button onClick={confirmModalConfig.onConfirm} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-red-500/10">
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ======== STAT CARD COMPONENT ========
function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 min-w-0" >
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{label}</div>
        <div className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5 truncate">{value}</div>
      </div>
    </div>
  );
}

// ======== LANDING PAGE COMPONENT ========
function LandingPage({ onLoginClick }: { onLoginClick: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white selection:bg-red-600/30 overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-700/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center border border-red-600/20 shadow-lg shadow-red-600/10">
            <Briefcase className="w-5 h-5 text-red-500" />
          </div>
          <span className="font-bold text-xl tracking-tight">Beragam Sewa</span>
        </div>
        <button onClick={onLoginClick} className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 transition">
          Login Staff
        </button>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-24 pb-32 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/10 border border-red-600/20 text-red-500 text-xs font-semibold mb-8 animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
          </span>
          Sistem ERP Terintegrasi 2026
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
          Manajemen Rental <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-blue-500">
            Lebih Cerdas & Akurat
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mb-12 animate-slide-up" style={{ animationDelay: '200ms' }}>
          Platform satu atap untuk mengelola jadwal event, persediaan alat, penjadwalan kru, dan akuntansi double-entry secara otomatis.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: '300ms' }}>
          <button onClick={onLoginClick} className="px-8 py-4 rounded-xl bg-red-700 hover:bg-red-600 text-slate-900 dark:text-white font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-900/20">
            Masuk ke Dashboard <ChevronRight className="w-5 h-5" />
          </button>
          <a href="https://beragamsewabali.com" target="_blank" rel="noreferrer" className="px-8 py-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-700 text-slate-900 dark:text-white font-semibold flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition">
            Kunjungi Website Utama
          </a>
        </div>
      </main>

      {/* Feature Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '400ms' }}>
        <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl border p-8 bg-slate-900/50 border-slate-200 dark:border-slate-800 backdrop-blur-sm hover:border-red-600/50 transition duration-300">
          <div className="w-12 h-12 rounded-2xl bg-red-600/10 flex items-center justify-center mb-6 border border-red-600/20">
            <CalendarDays className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Penjadwalan Interaktif</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Visualisasi timeline event dan setup dengan Gantt chart cerdas. Hindari bentrok jadwal penyewaan secara efektif.</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl border p-8 bg-slate-900/50 border-slate-200 dark:border-slate-800 backdrop-blur-sm hover:border-blue-500/50 transition duration-300">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20">
            <Activity className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Akuntansi Otomatis</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Setiap penyewaan yang selesai akan terintegrasi langsung ke sistem jurnal double-entry Cashflow Beragam Sewa Bali.</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl border p-8 bg-slate-900/50 border-slate-200 dark:border-slate-800 backdrop-blur-sm hover:border-amber-500/50 transition duration-300">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6 border border-amber-500/20">
            <Users className="w-6 h-6 text-amber-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Kolaborasi Kru</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Bagikan akses secara terstruktur (Owner, Accounting, Staff). Semua tindakan akan terekam dalam audit log.</p>
        </div>
      </section>
    </div>
  );
}

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const newAccounts = [
  { "account_code": "1-101", "account_name": "Kas", "category": "Asset", "normal_balance": "Debet", "is_active": true },
  { "account_code": "1-102", "account_name": "Bank", "category": "Asset", "normal_balance": "Debet", "is_active": true },
  { "account_code": "1-104", "account_name": "PPh 23 Dibayar Dimuka", "category": "Asset", "normal_balance": "Debet", "is_active": true },
  { "account_code": "1-201", "account_name": "Perlengkapan Alat Event", "category": "Asset", "normal_balance": "Debet", "is_active": true },
  { "account_code": "1-202", "account_name": "Perlengkapan Part & Suku Cadang", "category": "Asset", "normal_balance": "Debet", "is_active": true },
  { "account_code": "2-101", "account_name": "Utang Usaha Vendor", "category": "Liability", "normal_balance": "Kredit", "is_active": true },
  { "account_code": "2-103", "account_name": "Utang Pinjaman", "category": "Liability", "normal_balance": "Kredit", "is_active": true },
  { "account_code": "3-100", "account_name": "Modal Awal", "category": "Equity", "normal_balance": "Kredit", "is_active": true },
  { "account_code": "4-101", "account_name": "Pendapatan Sewa Alat", "category": "Revenue", "normal_balance": "Kredit", "is_active": true },
  { "account_code": "4-102", "account_name": "Pendapatan Jasa Service & Maintenance", "category": "Revenue", "normal_balance": "Kredit", "is_active": true },
  { "account_code": "5-101", "account_name": "Beban Gaji Kru & Teknisi", "category": "Expense", "normal_balance": "Debet", "is_active": true },
  { "account_code": "5-102", "account_name": "Beban Transport & Operasional Lapangan", "category": "Expense", "normal_balance": "Debet", "is_active": true },
  { "account_code": "5-103", "account_name": "Beban Pemeliharaan & Perawatan Alat", "category": "Expense", "normal_balance": "Debet", "is_active": true },
  { "account_code": "5-104", "account_name": "Beban Pengeluaran Pribadi/Harian (Owner)", "category": "Expense", "normal_balance": "Debet", "is_active": true },
  { "account_code": "5-105", "account_name": "Beban Marketing, Promosi & Admin Bank", "category": "Expense", "normal_balance": "Debet", "is_active": true },
  { "account_code": "5-106", "account_name": "Beban Konsultan & Legalitas", "category": "Expense", "normal_balance": "Debet", "is_active": true },
  { "account_code": "5-107", "account_name": "Beban Pajak Penghasilan (PPh)", "category": "Expense", "normal_balance": "Debet", "is_active": true },
  { "account_code": "5-109", "account_name": "Beban Sewa Sub-Vendor (Sewa Alat Luar)", "category": "Expense", "normal_balance": "Debet", "is_active": true }
];

const newTransactions = [
  {
    "date": "2026-01-01",
    "description": "Saldo Awal Kas & Bank",
    "entries": [
      { "account_code": "1-101", "debit": 614234, "credit": 0 },
      { "account_code": "1-102", "debit": 498815, "credit": 0 },
      { "account_code": "3-100", "debit": 0, "credit": 1113049 }
    ]
  },
  {
    "date": "2026-01-02",
    "description": "Job Akmani - Sewa Alat",
    "entries": [
      { "account_code": "1-102", "debit": 735000, "credit": 0 },
      { "account_code": "1-104", "debit": 15000, "credit": 0 },
      { "account_code": "4-101", "debit": 0, "credit": 750000 },
      { "account_code": "5-101", "debit": 250000, "credit": 0 },
      { "account_code": "1-102", "debit": 0, "credit": 250000 },
      { "account_code": "5-102", "debit": 200000, "credit": 0 },
      { "account_code": "1-102", "debit": 0, "credit": 200000 }
    ]
  },
  {
    "date": "2026-01-06",
    "description": "Fee Konsultan Des 2025 & PPh final pp55",
    "entries": [
      { "account_code": "5-106", "debit": 752500, "credit": 0 },
      { "account_code": "5-107", "debit": 259550, "credit": 0 },
      { "account_code": "1-102", "debit": 0, "credit": 1012050 }
    ]
  },
  {
    "date": "2026-01-08",
    "description": "Job Jaya Giri",
    "entries": [
      { "account_code": "1-101", "debit": 1000000, "credit": 0 },
      { "account_code": "4-101", "debit": 0, "credit": 1000000 },
      { "account_code": "5-102", "debit": 400000, "credit": 0 },
      { "account_code": "5-101", "debit": 216784, "credit": 0 },
      { "account_code": "1-101", "debit": 0, "credit": 616784 }
    ]
  },
  {
    "date": "2026-01-09",
    "description": "Job Istana Rama",
    "entries": [
      { "account_code": "1-102", "debit": 4018000, "credit": 0 },
      { "account_code": "1-104", "debit": 82000, "credit": 0 },
      { "account_code": "4-101", "debit": 0, "credit": 4100000 }
    ]
  },
  {
    "date": "2026-01-09",
    "description": "Sewa alat luar ke Vendor A",
    "entries": [
      { "account_code": "5-109", "debit": 1200000, "credit": 0 },
      { "account_code": "2-101", "debit": 0, "credit": 1200000 },
      { "account_code": "5-101", "debit": 800000, "credit": 0 },
      { "account_code": "5-102", "debit": 600000, "credit": 0 },
      { "account_code": "2-101", "debit": 1200000, "credit": 0 },
      { "account_code": "1-102", "debit": 0, "credit": 2600000 }
    ]
  },
  {
    "date": "2026-01-10",
    "description": "Pembelian kabel Toko Vince (Tempo ke Tunai)",
    "entries": [
      { "account_code": "1-202", "debit": 935000, "credit": 0 },
      { "account_code": "2-101", "debit": 0, "credit": 935000 },
      { "account_code": "2-101", "debit": 935000, "credit": 0 },
      { "account_code": "1-101", "debit": 0, "credit": 935000 }
    ]
  },
  {
    "date": "2026-01-11",
    "description": "Pembelian part Toko Vince (Utang Usaha)",
    "entries": [
      { "account_code": "1-202", "debit": 600000, "credit": 0 },
      { "account_code": "2-101", "debit": 0, "credit": 600000 }
    ]
  },
  {
    "date": "2026-01-15",
    "description": "Pinjam dana tunai Denok",
    "entries": [
      { "account_code": "1-101", "debit": 2500000, "credit": 0 },
      { "account_code": "2-103", "debit": 0, "credit": 2500000 }
    ]
  },
  {
    "date": "2026-01-15",
    "description": "Ganti ban mobil & service pickup (Kas Tunai)",
    "entries": [
      { "account_code": "1-202", "debit": 1300000, "credit": 0 },
      { "account_code": "5-103", "debit": 861116, "credit": 0 },
      { "account_code": "1-101", "debit": 0, "credit": 2161116 }
    ]
  },
  {
    "date": "2026-01-28",
    "description": "Sewa alat Sub-Vendor B (Utang)",
    "entries": [
      { "account_code": "5-109", "debit": 1500000, "credit": 0 },
      { "account_code": "2-101", "debit": 0, "credit": 1500000 }
    ]
  },
  {
    "date": "2026-01-28",
    "description": "Job Polda & Pelunasan Vendor B",
    "entries": [
      { "account_code": "1-102", "debit": 3250000, "credit": 0 },
      { "account_code": "4-101", "debit": 0, "credit": 3250000 },
      { "account_code": "5-101", "debit": 700000, "credit": 0 },
      { "account_code": "5-102", "debit": 500000, "credit": 0 },
      { "account_code": "5-105", "debit": 400000, "credit": 0 },
      { "account_code": "2-101", "debit": 1500000, "credit": 0 },
      { "account_code": "1-102", "debit": 0, "credit": 3100000 }
    ]
  },
  {
    "date": "2026-01-29",
    "description": "Pelunasan Toko Vince via Bank",
    "entries": [
      { "account_code": "2-101", "debit": 600000, "credit": 0 },
      { "account_code": "1-102", "debit": 0, "credit": 600000 }
    ]
  },
  {
    "date": "2026-01-30",
    "description": "Biaya Admin Bank",
    "entries": [
      { "account_code": "5-105", "debit": 46000, "credit": 0 },
      { "account_code": "1-102", "debit": 0, "credit": 46000 }
    ]
  },
  {
    "date": "2026-01-31",
    "description": "Service Beta3 & Biaya Operasional harian",
    "entries": [
      { "account_code": "5-103", "debit": 450000, "credit": 0 },
      { "account_code": "5-102", "debit": 237834, "credit": 0 },
      { "account_code": "1-101", "debit": 0, "credit": 401334 },
      { "account_code": "1-102", "debit": 0, "credit": 286500 }
    ]
  },
  {
    "date": "2026-02-28",
    "description": "Hutang part Shopee",
    "entries": [
      { "account_code": "1-202", "debit": 2447768, "credit": 0 },
      { "account_code": "2-101", "debit": 0, "credit": 2447768 }
    ]
  }
];

async function seed() {
  console.log('Seeding data...');
  
  const { data: users, error: errUsers } = await supabase.auth.admin.listUsers();
  const userId = users && users.users.length > 0 ? users.users[0].id : '00000000-0000-0000-0000-000000000000';

  console.log('Deleting existing journal entries...');
  const { error: e1 } = await supabase.from('journal_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (e1) console.error('Error deleting journal_entries', e1);

  console.log('Deleting existing transactions...');
  const { error: e2 } = await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (e2) console.error('Error deleting transactions', e2);

  console.log('Deleting existing accounts...');
  const { error: e3 } = await supabase.from('accounts').delete().neq('account_code', 'nonexistent');
  if (e3) console.error('Error deleting accounts', e3);

  console.log('Inserting accounts...');
  const { error: e4 } = await supabase.from('accounts').insert(newAccounts);
  if (e4) console.error('Error inserting accounts', e4);

  console.log('Inserting transactions...');
  for (const t of newTransactions) {
    const { data: tx, error: txError } = await supabase.from('transactions').insert({
      description: t.description,
      date: t.date,
      created_by: userId,
      is_adjusting: false
    }).select().single();

    if (txError) {
      console.error('Error inserting transaction', t.description, txError);
      continue;
    }

    const jEntries = t.entries.map(e => ({
      transaction_id: tx.id,
      account_code: e.account_code,
      debit: e.debit,
      credit: e.credit
    }));

    const { error: jeError } = await supabase.from('journal_entries').insert(jEntries);
    if (jeError) {
      console.error('Error inserting journal entries for', t.description, jeError);
    }
  }

  console.log('✅ Done seeding!');
}

seed().catch(console.error);

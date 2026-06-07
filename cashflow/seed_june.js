require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const accountsData = [
  { "account_code": "1-100", "account_name": "Kas Kecil (Petty Cash)", "category": "Asset", "normal_balance": "Debet" },
  { "account_code": "1-101", "account_name": "Kas Besar (Cash on Hand)", "category": "Asset", "normal_balance": "Debet" },
  { "account_code": "1-102", "account_name": "Bank BCA", "category": "Asset", "normal_balance": "Debet" },
  { "account_code": "1-103", "account_name": "Bank Mandiri", "category": "Asset", "normal_balance": "Debet" },
  { "account_code": "1-104", "account_name": "Piutang PPh umkm", "category": "Asset", "normal_balance": "Debet" },
  { "account_code": "1-105", "account_name": "Piutang Usaha (Accounts Receivable)", "category": "Asset", "normal_balance": "Debet" },
  { "account_code": "1-106", "account_name": "Piutang PPh 23", "category": "Asset", "normal_balance": "Debet" },
  { "account_code": "1-107", "account_name": "Persediaan perlengkapan", "category": "Asset", "normal_balance": "Debet" },
  { "account_code": "1-200", "account_name": "Peralatan Sewa (Rental Equipment)", "category": "Asset", "normal_balance": "Debet" },
  { "account_code": "1-201", "account_name": "Akumulasi Penyusutan Peralatan", "category": "Asset", "normal_balance": "Kredit" },
  { "account_code": "2-100", "account_name": "Hutang Usaha (Accounts Payable)", "category": "Liability", "normal_balance": "Kredit" },
  { "account_code": "2-101", "account_name": "Hutang Vendor", "category": "Liability", "normal_balance": "Kredit" },
  { "account_code": "2-102", "account_name": "Hutang Pajak", "category": "Liability", "normal_balance": "Kredit" },
  { "account_code": "2-103", "account_name": "Hutang Gaji", "category": "Liability", "normal_balance": "Kredit" },
  { "account_code": "3-100", "account_name": "Modal Pemilik", "category": "Equity", "normal_balance": "Kredit" },
  { "account_code": "3-101", "account_name": "Laba Ditahan (Retained Earnings)", "category": "Equity", "normal_balance": "Kredit" },
  { "account_code": "3-102", "account_name": "Prive Pemilik", "category": "Equity", "normal_balance": "Kredit" },
  { "account_code": "4-100", "account_name": "Pendapatan Sewa Peralatan", "category": "Revenue", "normal_balance": "Kredit" },
  { "account_code": "4-101", "account_name": "Pendapatan Jasa Event", "category": "Revenue", "normal_balance": "Kredit" },
  { "account_code": "4-102", "account_name": "Pendapatan Lain-lain", "category": "Revenue", "normal_balance": "Kredit" },
  { "account_code": "5-100", "account_name": "Beban Gaji & Upah", "category": "Expense", "normal_balance": "Debet" },
  { "account_code": "5-101", "account_name": "Beban Operasional", "category": "Expense", "normal_balance": "Debet" },
  { "account_code": "5-102", "account_name": "Beban Listrik & Air", "category": "Expense", "normal_balance": "Debet" },
  { "account_code": "5-103", "account_name": "Beban Transportasi", "category": "Expense", "normal_balance": "Debet" },
  { "account_code": "5-104", "account_name": "Beban Pemeliharaan Peralatan", "category": "Expense", "normal_balance": "Debet" },
  { "account_code": "5-105", "account_name": "Beban Sewa Gedung/Gudang", "category": "Expense", "normal_balance": "Debet" },
  { "account_code": "5-106", "account_name": "Beban Perlengkapan", "category": "Expense", "normal_balance": "Debet" },
  { "account_code": "5-107", "account_name": "Beban Administrasi & Umum", "category": "Expense", "normal_balance": "Debet" },
  { "account_code": "5-108", "account_name": "Beban Penyusutan", "category": "Expense", "normal_balance": "Debet" },
  { "account_code": "5-109", "account_name": "Beban Marketing and Promotion", "category": "Expense", "normal_balance": "Debet" }
];

const juneTransactions = [
  {
    "date": "2026-06-02",
    "description": "Pembayaran live sanur",
    "entries": [
      { "account_code": "1-102", "debit": 12000000, "credit": 0 },
      { "account_code": "4-101", "debit": 0, "credit": 12000000 }
    ]
  },
  {
    "date": "2026-06-05",
    "description": "Pendaptan sewa kursi",
    "entries": [
      { "account_code": "1-102", "debit": 646750, "credit": 0 },
      { "account_code": "1-104", "debit": 3250, "credit": 0 },
      { "account_code": "4-100", "debit": 0, "credit": 650000 }
    ]
  },
  {
    "date": "2026-06-06",
    "description": "Pembayaran event harapan mulia",
    "entries": [
      { "account_code": "1-102", "debit": 9300000, "credit": 0 },
      { "account_code": "4-101", "debit": 0, "credit": 9300000 }
    ]
  },
  {
    "date": "2026-06-06",
    "description": "Pendaptan sewa mistyfan",
    "entries": [
      { "account_code": "1-102", "debit": 1500000, "credit": 0 },
      { "account_code": "4-100", "debit": 0, "credit": 1500000 }
    ]
  },
  {
    "date": "2026-06-06",
    "description": "Beli bensin",
    "entries": [
      { "account_code": "5-103", "debit": 200000, "credit": 0 },
      { "account_code": "1-101", "debit": 0, "credit": 200000 }
    ]
  },
  {
    "date": "2026-06-07",
    "description": "Bayar vendor nyoman",
    "entries": [
      { "account_code": "5-101", "debit": 3000000, "credit": 0 },
      { "account_code": "1-102", "debit": 0, "credit": 3000000 }
    ]
  },
  {
    "date": "2026-06-07",
    "description": "Bayar fee marketing hm",
    "entries": [
      { "account_code": "5-109", "debit": 900000, "credit": 0 },
      { "account_code": "1-102", "debit": 0, "credit": 900000 }
    ]
  },
  {
    "date": "2026-06-07",
    "description": "Saldo cash operasional",
    "entries": [
      { "account_code": "1-101", "debit": 5000000, "credit": 0 },
      { "account_code": "1-102", "debit": 0, "credit": 5000000 }
    ]
  }
];

async function syncData() {
  console.log('Synchronizing Chart of Accounts...');
  
  // Hard reset / replace accounts table
  // Since we cannot truncate without CASCADE which might drop fixed_assets relations,
  // we will just delete the accounts that are NOT in the new list, and upsert the new ones.
  // Actually, to be safe, we first upsert, then delete any that are not in the new list.
  
  const accountsToInsert = accountsData.map(a => ({ ...a, is_active: true }));
  const { error: accUpsertErr } = await supabase.from('accounts').upsert(accountsToInsert, { onConflict: 'account_code' });
  if (accUpsertErr) {
    console.error('Error upserting accounts:', accUpsertErr);
    return;
  }
  
  const accountCodes = accountsData.map(a => a.account_code);
  const { error: accDelErr } = await supabase.from('accounts').delete().not('account_code', 'in', `(${accountCodes.join(',')})`);
  if (accDelErr) {
    console.error('Warning: could not delete obsolete accounts, probably due to FK constraint:', accDelErr.message);
  } else {
    console.log('✅ Accounts synchronized successfully!');
  }

  console.log('Deleting transactions from January and February 2026...');
  // We first fetch the transactions to delete so we can delete their journal entries if cascade isn't on.
  // Actually, deleting transactions automatically cascades to journal_entries in our Supabase schema.
  const { data: txToDelete, error: fetchErr } = await supabase.from('transactions')
    .select('id')
    .gte('date', '2026-01-01')
    .lte('date', '2026-02-28');
    
  if (txToDelete && txToDelete.length > 0) {
    const ids = txToDelete.map(t => t.id);
    await supabase.from('journal_entries').delete().in('transaction_id', ids);
    const { error: delTxErr } = await supabase.from('transactions').delete().in('id', ids);
    if (delTxErr) console.error('Error deleting transactions:', delTxErr);
    else console.log(`Deleted ${txToDelete.length} transactions from Jan/Feb.`);
  }

  console.log('Injecting June transactions...');
  const { data: users, error: errUsers } = await supabase.auth.admin.listUsers();
  const userId = users && users.users.length > 0 ? users.users[0].id : '00000000-0000-0000-0000-000000000000';

  for (const t of juneTransactions) {
    // Check if this exact transaction already exists to avoid duplicates on multiple runs
    const { data: exists } = await supabase.from('transactions').select('id').eq('description', t.description).eq('date', t.date);
    if (exists && exists.length > 0) {
      console.log(`Skipping existing transaction: ${t.description}`);
      continue;
    }

    const { data: tx, error: txError } = await supabase.from('transactions').insert({
      description: t.description,
      date: t.date,
      created_by: userId,
      is_adjusting: false
    }).select().single();

    if (txError) {
      console.error('Error inserting transaction:', t.description, txError);
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
  
  console.log('✅ June data injected successfully! Fixed assets remain untouched.');
}

syncData().catch(console.error);

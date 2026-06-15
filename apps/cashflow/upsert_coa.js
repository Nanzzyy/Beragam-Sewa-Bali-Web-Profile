require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const accounts = [
  { "account_code": "1-101", "account_name": "Kas", "category": "Asset", "normal_balance": "Debet" },
  { "account_code": "1-102", "account_name": "Bank", "category": "Asset", "normal_balance": "Debet" },
  { "account_code": "1-104", "account_name": "PPh 23 Dibayar Dimuka", "category": "Asset", "normal_balance": "Debet" },
  { "account_code": "1-201", "account_name": "Inventaris Alat Event (Sound/Lighting/Multimedia)", "category": "Asset", "normal_balance": "Debet" },
  { "account_code": "1-202", "account_name": "Perlengkapan Part dll", "category": "Asset", "normal_balance": "Debet" },
  { "account_code": "1-203", "account_name": "Akumulasi Penyusutan Suzuki Pickup", "category": "Asset", "normal_balance": "Kredit" },
  { "account_code": "1-204", "account_name": "Akumulasi Penyusutan Alat Audio/Sound", "category": "Asset", "normal_balance": "Kredit" },
  { "account_code": "1-205", "account_name": "Akumulasi Penyusutan Lighting/Beam", "category": "Asset", "normal_balance": "Kredit" },
  { "account_code": "2-101", "account_name": "Utang usaha (Vendor, Suku Cadang)", "category": "Liability", "normal_balance": "Kredit" },
  { "account_code": "2-103", "account_name": "Utang Pinjaman", "category": "Liability", "normal_balance": "Kredit" },
  { "account_code": "3-100", "account_name": "Modal", "category": "Equity", "normal_balance": "Kredit" },
  { "account_code": "4-101", "account_name": "Pendapatan Sewa Alat", "category": "Revenue", "normal_balance": "Kredit" },
  { "account_code": "4-102", "account_name": "Pendapatan Jasa Service & Maintenance", "category": "Revenue", "normal_balance": "Kredit" },
  { "account_code": "5-101", "account_name": "Beban Gaji Kru/ Teknisi", "category": "Expense", "normal_balance": "Debet" },
  { "account_code": "5-102", "account_name": "Beban Transport & Operasional", "category": "Expense", "normal_balance": "Debet" },
  { "account_code": "5-103", "account_name": "Beban Pemeliharaan Alat", "category": "Expense", "normal_balance": "Debet" },
  { "account_code": "5-104", "account_name": "Beban Kehidupan Sehari-hari (Owner)", "category": "Expense", "normal_balance": "Debet" },
  { "account_code": "5-105", "account_name": "Beban Marketing & Promosi", "category": "Expense", "normal_balance": "Debet" },
  { "account_code": "5-106", "account_name": "Beban Konsultan", "category": "Expense", "normal_balance": "Debet" },
  { "account_code": "5-107", "account_name": "Beban Pajak Penghasilan", "category": "Expense", "normal_balance": "Debet" },
  { "account_code": "5-108", "account_name": "Beban Penyusutan Kendaraan & Alat", "category": "Expense", "normal_balance": "Debet" },
  { "account_code": "5-109", "account_name": "Beban Sewa", "category": "Expense", "normal_balance": "Debet" }
];

const fixedAssetsData = [
  { "no": 1, "asset_name": "Suzuki Pickup", "expense_account_code": "5-108", "accum_account_code": "1-203", "purchase_date": "2011-12-31", "acquisition_cost": 98000000, "useful_life_years": 8, "residual_value": 15000000 },
  { "no": 2, "asset_name": "Mixer Allen n Heat ZED428", "expense_account_code": "5-108", "accum_account_code": "1-204", "purchase_date": "2011-12-31", "acquisition_cost": 15000000, "useful_life_years": 8, "residual_value": 6000000 },
  { "no": 4, "asset_name": "beam prolight 295b", "expense_account_code": "5-108", "accum_account_code": "1-205", "purchase_date": "2025-12-28", "acquisition_cost": 15000000, "useful_life_years": 4, "residual_value": 5000000 }
];

async function runUpsert() {
  console.log('Upserting accounts...');
  // Add is_active: true to all since it's required in the DB schema
  const accountsToInsert = accounts.map(a => ({ ...a, is_active: true }));
  
  const { error: accErr } = await supabase.from('accounts').upsert(accountsToInsert, { onConflict: 'account_code' });
  if (accErr) {
    console.error('Failed to upsert accounts:', accErr);
    return;
  }
  console.log('Successfully upserted accounts!');

  console.log('Upserting fixed assets with account mappings...');
  const dbRecords = fixedAssetsData.map(item => ({
    asset_code: `FA-${String(item.no).padStart(3, '0')}`,
    asset_name: item.asset_name,
    purchase_date: item.purchase_date,
    purchase_cost: item.acquisition_cost,
    useful_life: item.useful_life_years,
    salvage_value: item.residual_value,
    expense_account_code: item.expense_account_code,
    accum_account_code: item.accum_account_code,
    is_active: true
  }));

  const { error: faErr } = await supabase.from('fixed_assets').upsert(dbRecords, { onConflict: 'asset_code' });
  if (faErr) {
    console.error('Failed to upsert fixed assets. Ensure database schema has "expense_account_code" and "accum_account_code" columns:', faErr);
  } else {
    console.log('Successfully upserted fixed assets!');
  }
}

runUpsert().catch(console.error);

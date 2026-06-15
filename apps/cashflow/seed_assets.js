require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const fixedAssetsData = [
  {
    "no": 1,
    "asset_name": "Suzuki Pickup",
    "expense_account_code": "",
    "expense_account_name": "",
    "accum_account_code": "",
    "accum_account_name": "",
    "purchase_date": "2011-12-31",
    "acquisition_cost": 98000000,
    "useful_life_years": 8,
    "useful_life_months": 96,
    "residual_value": 15000000,
    "yearly_depreciation": 10375000,
    "monthly_depreciation": 864583.33,
    "accumulated_depreciation": 83000000,
    "book_value": 15000000,
    "status": "peremajaan",
    "asset_condition": "HABIS MASA MANFAAT"
  },
  {
    "no": 2,
    "asset_name": "Mixer Allen n Heat ZED428",
    "expense_account_code": "",
    "expense_account_name": "",
    "accum_account_code": "",
    "accum_account_name": "",
    "purchase_date": "2011-12-31",
    "acquisition_cost": 15000000,
    "useful_life_years": 8,
    "useful_life_months": 96,
    "residual_value": 6000000,
    "yearly_depreciation": 1125000,
    "monthly_depreciation": 93750.00,
    "accumulated_depreciation": 9000000,
    "book_value": 6000000,
    "status": "peremajaan",
    "asset_condition": "HABIS MASA MANFAAT"
  },
  {
    "no": 3,
    "asset_name": "Dbtech opera",
    "expense_account_code": "",
    "expense_account_name": "",
    "accum_account_code": "",
    "accum_account_name": "",
    "purchase_date": "2019-12-01",
    "acquisition_cost": 54000000,
    "useful_life_years": 6,
    "useful_life_months": 72,
    "residual_value": 15000000,
    "yearly_depreciation": 6500000,
    "monthly_depreciation": 541666.67,
    "accumulated_depreciation": 39000000,
    "book_value": 15000000,
    "status": "peremajaan",
    "asset_condition": "HABIS MASA MANFAAT"
  },
  {
    "no": 4,
    "asset_name": "beam prolight 295b",
    "expense_account_code": "",
    "expense_account_name": "",
    "accum_account_code": "",
    "accum_account_name": "",
    "purchase_date": "2025-12-28",
    "acquisition_cost": 15000000,
    "useful_life_years": 4,
    "useful_life_months": 48,
    "residual_value": 5000000,
    "yearly_depreciation": 2500000,
    "monthly_depreciation": 208333.33,
    "accumulated_depreciation": 1041667,
    "book_value": 13958333,
    "status": "masih layak",
    "asset_condition": "MASIH DISUSUTKAN"
  },
  {
    "no": 5,
    "asset_name": "Beta3 u15a",
    "expense_account_code": "",
    "expense_account_name": "",
    "accum_account_code": "",
    "accum_account_name": "",
    "purchase_date": "2007-12-12",
    "acquisition_cost": 40000000,
    "useful_life_years": 5,
    "useful_life_months": 60,
    "residual_value": 16000000,
    "yearly_depreciation": 4800000,
    "monthly_depreciation": 400000.00,
    "accumulated_depreciation": 24000000,
    "book_value": 16000000,
    "status": "peremajaan",
    "asset_condition": "HABIS MASA MANFAAT"
  },
  {
    "no": 6,
    "asset_name": "Huper Z215",
    "expense_account_code": "",
    "expense_account_name": "",
    "accum_account_code": "",
    "accum_account_name": "",
    "purchase_date": "2017-12-12",
    "acquisition_cost": 20000000,
    "useful_life_years": 8,
    "useful_life_months": 96,
    "residual_value": 8000000,
    "yearly_depreciation": 1500000,
    "monthly_depreciation": 125000.00,
    "accumulated_depreciation": 12000000,
    "book_value": 8000000,
    "status": "peremajaan",
    "asset_condition": "HABIS MASA MANFAAT"
  },
  {
    "no": 7,
    "asset_name": "Beta3 Zigma18",
    "expense_account_code": "",
    "expense_account_name": "",
    "accum_account_code": "",
    "accum_account_name": "",
    "purchase_date": "2013-12-12",
    "acquisition_cost": 14000000,
    "useful_life_years": 8,
    "useful_life_months": 96,
    "residual_value": 6000000,
    "yearly_depreciation": 1000000,
    "monthly_depreciation": 83333.33,
    "accumulated_depreciation": 8000000,
    "book_value": 6000000,
    "status": "peremajaan",
    "asset_condition": "HABIS MASA MANFAAT"
  },
  {
    "no": 8,
    "asset_name": "Behringer Sub18",
    "expense_account_code": "",
    "expense_account_name": "",
    "accum_account_code": "",
    "accum_account_name": "",
    "purchase_date": "2014-12-12",
    "acquisition_cost": 16000000,
    "useful_life_years": 8,
    "useful_life_months": 96,
    "residual_value": 6000000,
    "yearly_depreciation": 1250000,
    "monthly_depreciation": 104166.67,
    "accumulated_depreciation": 1000000,
    "book_value": 6000000,
    "status": "peremajaan",
    "asset_condition": "HABIS MASA MANFAAT"
  },
  {
    "no": 9,
    "asset_name": "extreme vs4000",
    "expense_account_code": "",
    "expense_account_name": "",
    "accum_account_code": "",
    "accum_account_name": "",
    "purchase_date": "2014-12-12",
    "acquisition_cost": 15000000,
    "useful_life_years": 8,
    "useful_life_months": 96,
    "residual_value": 6000000,
    "yearly_depreciation": 1125000,
    "monthly_depreciation": 93750.00,
    "accumulated_depreciation": 9000000,
    "book_value": 6000000,
    "status": "peremajaan",
    "asset_condition": "HABIS MASA MANFAAT"
  },
  {
    "no": 10,
    "asset_name": "Soundcraft mfxi20",
    "expense_account_code": "",
    "expense_account_name": "",
    "accum_account_code": "",
    "accum_account_name": "",
    "purchase_date": "2014-12-12",
    "acquisition_cost": 6000000,
    "useful_life_years": 8,
    "useful_life_months": 96,
    "residual_value": 15000000,
    "yearly_depreciation": 562500,
    "monthly_depreciation": 46875.00,
    "accumulated_depreciation": 4500000,
    "book_value": 15000000,
    "status": "peremajaan",
    "asset_condition": "HABIS MASA MANFAAT"
  },
  {
    "no": 11,
    "asset_name": "mackie 20fx",
    "expense_account_code": "",
    "expense_account_name": "",
    "accum_account_code": "",
    "accum_account_name": "",
    "purchase_date": "2014-12-12",
    "acquisition_cost": 5500000,
    "useful_life_years": 8,
    "useful_life_months": 96,
    "residual_value": 15000000,
    "yearly_depreciation": 500000,
    "monthly_depreciation": 41666.67,
    "accumulated_depreciation": 4000000,
    "book_value": 15000000,
    "status": "peremajaan",
    "asset_condition": "HABIS MASA MANFAAT"
  },
  {
    "no": 12,
    "asset_name": "yamaha Mg16xu",
    "expense_account_code": "",
    "expense_account_name": "",
    "accum_account_code": "",
    "accum_account_name": "",
    "purchase_date": "2015-12-12",
    "acquisition_cost": 4500000,
    "useful_life_years": 8,
    "useful_life_months": 96,
    "residual_value": 2000000,
    "yearly_depreciation": 312500,
    "monthly_depreciation": 26041.67,
    "accumulated_depreciation": 2500000,
    "book_value": 2000000,
    "status": "peremajaan",
    "asset_condition": "HABIS MASA MANFAAT"
  }
];

async function seed() {
  console.log('Seeding fixed assets data...');

  // 1. Delete all existing fixed assets
  console.log('Deleting existing fixed assets...');
  const { error: e1 } = await supabase.from('fixed_assets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (e1) console.error('Error deleting fixed assets', e1);

  // 2. Map JSON data to the Supabase database schema
  const dbRecords = fixedAssetsData.map(item => {
    return {
      asset_code: `FA-${String(item.no).padStart(3, '0')}`,
      asset_name: item.asset_name,
      purchase_date: item.purchase_date,
      purchase_cost: item.acquisition_cost,
      useful_life: item.useful_life_years,
      salvage_value: item.residual_value,
      is_active: true
    };
  });

  // 3. Bulk insert
  console.log('Inserting new fixed assets...');
  const { error: e2 } = await supabase.from('fixed_assets').insert(dbRecords);
  if (e2) console.error('Error inserting fixed assets', e2);
  else console.log('Successfully inserted ' + dbRecords.length + ' fixed assets.');

  console.log('✅ Done seeding fixed assets!');
}

seed().catch(console.error);

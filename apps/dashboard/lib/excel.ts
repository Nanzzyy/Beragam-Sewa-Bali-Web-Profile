import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { Job, JobItem } from './supabase';
import { formatDate, supabase } from './supabase';

function terbilang(angka: number): string {
  const huruf = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];
  let hasil = '';

  if (angka < 12) {
    hasil = huruf[Math.floor(angka)];
  } else if (angka < 20) {
    hasil = terbilang(angka - 10) + ' Belas';
  } else if (angka < 100) {
    hasil = terbilang(angka / 10) + ' Puluh ' + terbilang(angka % 10);
  } else if (angka < 200) {
    hasil = 'Seratus ' + terbilang(angka - 100);
  } else if (angka < 1000) {
    hasil = terbilang(angka / 100) + ' Ratus ' + terbilang(angka % 100);
  } else if (angka < 2000) {
    hasil = 'Seribu ' + terbilang(angka - 1000);
  } else if (angka < 1000000) {
    hasil = terbilang(angka / 1000) + ' Ribu ' + terbilang(angka % 1000);
  } else if (angka < 1000000000) {
    hasil = terbilang(angka / 1000000) + ' Juta ' + terbilang(angka % 1000000);
  } else if (angka < 1000000000000) {
    hasil = terbilang(angka / 1000000000) + ' Milyar ' + terbilang(angka % 1000000000);
  } else if (angka < 1000000000000000) {
    hasil = terbilang(angka / 1000000000000) + ' Trilyun ' + terbilang(angka % 1000000000000);
  }

  return hasil.trim();
}

function getRomanMonth(date: Date) {
  return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][date.getMonth()];
}

/** Detect image extension from a base64 data URI string */
function detectImageExt(base64: string): 'png' | 'jpeg' {
  const match = base64.match(/data:image\/(png|jpeg|jpg);base64,/i);
  if (match) {
    const raw = match[1].toLowerCase();
    return raw === 'jpg' ? 'jpeg' : (raw as 'png' | 'jpeg');
  }
  return 'png';
}

/** Thin border style constant for reuse */
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  bottom: { style: 'thin' },
  left: { style: 'thin' },
  right: { style: 'thin' },
};

export async function generateExcel(job: Job, items: any[], type: 'invoice' | 'quotation' | 'receipt') {
  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Beragam Sewa Bali';
    const targetSheetName = type === 'invoice' ? 'INV' : type === 'quotation' ? 'QUO' : 'KWT';
    const ws = wb.addWorksheet(targetSheetName, { views: [{ showGridLines: false }] });

    // ── Column widths ──
    ws.columns = [
      { width: 4 },   // A: Left margin
      { width: 12 },  // B: No / Label
      { width: 2 },   // C: Colon
      { width: 45 },  // D: Value
      { width: 8 },   // E: Qty
      { width: 12 },  // F: Unit
      { width: 8 },   // G: Day
      { width: 18 },  // H: Unit Price
      { width: 20 },  // I: Jumlah
      { width: 4 },   // J: Right margin
    ];

    // ── Fetch company config (shared with PDF) ──
    const { getCompanyConfig } = await import('./pdf');
    const config = await getCompanyConfig();

    // Parse bank info from payment string
    let bankName = 'BCA';
    let bankNumber = '6110252194';
    let bankOwner = 'an. Eka Sutrisna Putra';
    if (config.payment) {
      const bankMatch = config.payment.match(/Bank\s+([A-Za-z0-9]+)/i);
      const numMatch = config.payment.match(/(?:No\.?\s*Rek\.?\s*)?(\d{5,20})/i);
      const ownerMatch = config.payment.match(/(?:a\.n\.?|an\.?)\s*([^,\n]+)/i);
      if (bankMatch) bankName = bankMatch[1].toUpperCase();
      if (numMatch) bankNumber = numMatch[1];
      if (ownerMatch) bankOwner = 'an. ' + ownerMatch[1].trim();
    }

    // Pre-fetch package sub-items
    const packageItemsMap: Record<string, any[]> = {};
    for (const item of items) {
      if (item.is_package && item.package_id && !packageItemsMap[item.package_id]) {
        const { data } = await supabase.from('package_items').select('qty, items:item_id(name)').eq('package_id', item.package_id);
        if (data) packageItemsMap[item.package_id] = data;
      }
    }

    // ══════════════════════════════════════════════
    //  ROWS 1-3: Company Header Image Area
    // ══════════════════════════════════════════════
    // Reserve 3 rows for the header image, matching the PDF layout
    ws.addRow([]); // row 1
    ws.addRow([]); // row 2
    ws.addRow([]); // row 3

    // Set header rows height to accommodate the image
    ws.getRow(1).height = 25;
    ws.getRow(2).height = 25;
    ws.getRow(3).height = 25;

    if (config.header) {
      try {
        const headerImgId = wb.addImage({
          base64: config.header,
          extension: detectImageExt(config.header),
        });
        // Span the header across columns A-J, rows 1-3
        ws.addImage(headerImgId, {
          tl: { col: 0, row: 0 } as any,
          br: { col: 9, row: 3 } as any,
        });
      } catch (e) {
        console.error('Failed to add header image to Excel:', e);
      }
    }

    // Row 4: spacer
    ws.addRow([]);

    // ══════════════════════════════════════════════
    //  SECTION 1: Client Info (Left) & Office Info (Right)
    // ══════════════════════════════════════════════
    const writeField = (rowNum: number, leftLabel: string, leftVal: string, rightLabel: string, rightVal: string) => {
      const row = ws.getRow(rowNum);
      row.height = 18;
      if (leftLabel) {
        row.getCell('B').value = leftLabel;
        row.getCell('B').font = { bold: true, size: 10 };
        row.getCell('C').value = ':';
        row.getCell('C').font = { bold: true, size: 10 };
        row.getCell('D').value = leftVal;
        row.getCell('D').font = { size: 10 };
      }
      if (rightLabel) {
        row.getCell('F').value = rightLabel;
        row.getCell('F').font = { bold: true, size: 10 };
        row.getCell('G').value = ':';
        row.getCell('G').font = { bold: true, size: 10 };
        row.getCell('G').alignment = { horizontal: 'left' };
        row.getCell('H').value = rightVal;
        row.getCell('H').font = { size: 10 };
        ws.mergeCells(`H${rowNum}:I${rowNum}`);
        row.getCell('H').alignment = { wrapText: true, vertical: 'top' };
      }
    };

    let startRow = 5;
    writeField(startRow++, 'CLIENT', job.client_name, 'OFFICE ADDRESS', config.address);
    writeField(startRow++, 'CONTACT', job.contact_person || job.client_name, '', '');
    writeField(startRow++, 'ADDRESS', job.client_address || '-', 'PHONE', config.phone);
    writeField(startRow++, 'EMAIL', job.client_email || '-', 'EMAIL', config.email);

    const projectName = (job.description || 'EVENT') + (job.venue ? ` / ${job.venue}` : '');
    writeField(startRow++, 'PHONE', job.client_phone || '-', 'NPWP', config.npwp || '-');
    writeField(startRow++, 'PROJECT', projectName, 'BANK ACCOUNT', bankName);

    const tglMulai = formatDate(job.job_date);
    const tglSelesai = job.completion_date ? formatDate(job.completion_date) : '';
    const eventDateRange = tglSelesai && tglSelesai !== '-' ? `${tglMulai} s/d ${tglSelesai}` : tglMulai;
    writeField(startRow++, 'TGL EVENT', eventDateRange, '', bankNumber);
    writeField(startRow++, '', '', '', bankOwner);

    // ══════════════════════════════════════════════
    //  SECTION 2: Document Title & Number
    // ══════════════════════════════════════════════
    const docTypeLabel = type === 'invoice' ? 'INVOICE' : type === 'quotation' ? 'QUOTATION' : 'KUITANSI';
    const date = new Date(job.created_at || Date.now());
    const docTypeCode = type === 'invoice' ? 'INV' : type === 'quotation' ? 'QUO' : 'KWT';
    const docNumber = `01/BSB/${docTypeCode}/${getRomanMonth(date)}/${date.getFullYear()}`;

    const titleRowNum = startRow + 1;
    const titleRow = ws.getRow(titleRowNum);
    titleRow.height = 28;
    titleRow.getCell('B').value = docTypeLabel;
    titleRow.getCell('B').font = { bold: true, size: 16 };
    ws.mergeCells(`B${titleRowNum}:D${titleRowNum}`);
    titleRow.getCell('I').value = `NO : ${docNumber}`;
    titleRow.getCell('I').font = { bold: true, size: 10 };
    titleRow.getCell('I').alignment = { horizontal: 'right', vertical: 'middle' };

    startRow = titleRowNum + 2;

    // ══════════════════════════════════════════════
    //  SECTION 3: Table Header  (height = 0.55" ≈ 39.6pt)
    // ══════════════════════════════════════════════
    const headerRow = ws.getRow(startRow);
    headerRow.height = 39.6; // 0.55 inch

    headerRow.getCell('B').value = 'NO';
    headerRow.getCell('C').value = 'NAMA BARANG / DESKRIPSI';
    ws.mergeCells(`C${startRow}:D${startRow}`);
    headerRow.getCell('E').value = 'QTY';
    headerRow.getCell('F').value = 'UNIT';
    headerRow.getCell('G').value = 'DAY';
    headerRow.getCell('H').value = 'UNIT PRICE';
    headerRow.getCell('I').value = 'JUMLAH';

    ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].forEach(col => {
      const cell = headerRow.getCell(col);
      cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = THIN_BORDER;
    });
    // Description column left-aligned
    headerRow.getCell('C').alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    startRow++;

    // ══════════════════════════════════════════════
    //  SECTION 4: Table Data Rows (with padding)
    // ══════════════════════════════════════════════
    let subtotal = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let displayName = item.item_name || item.item_name_custom || '-';
      if (item.is_package) {
        let packageInfo = `[PAKET] ${displayName}`;
        if (item.package_id && packageItemsMap[item.package_id]) {
          const details = packageItemsMap[item.package_id].map(pi => `  - ${pi.qty}x ${pi.items?.name}`).join('\n');
          if (details) packageInfo += `\n${details}`;
        }
        displayName = packageInfo;
      }

      const qty = item.quantity || 0;
      const days = item.days || 1;
      const price = item.sub_rent_cost || 0;
      const total = qty * days * price;
      subtotal += total;

      const row = ws.getRow(startRow);
      row.height = 28; // Data row padding

      row.getCell('B').value = i + 1;
      row.getCell('C').value = displayName;
      ws.mergeCells(`C${startRow}:D${startRow}`);
      row.getCell('E').value = qty;
      row.getCell('F').value = item.is_package ? 'pkg' : 'unit';
      row.getCell('G').value = days;
      row.getCell('H').value = price;
      row.getCell('I').value = total;

      ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].forEach(col => {
        const cell = row.getCell(col);
        const isDesc = col === 'C' || col === 'D';
        const isMoney = col === 'H' || col === 'I';

        cell.alignment = {
          vertical: 'middle',
          wrapText: true,
          horizontal: isDesc ? 'left' : isMoney ? 'right' : 'center',
          indent: isDesc ? 1 : isMoney ? 1 : 0,
        };
        cell.border = THIN_BORDER;
        cell.font = { size: 10 };
        if (isMoney) cell.numFmt = 'Rp #,##0';
      });

      if (item.is_package) {
        row.getCell('C').font = { bold: true, size: 10 };
      }

      startRow++;
    }

    // ══════════════════════════════════════════════
    //  SECTION 5: Totals
    // ══════════════════════════════════════════════
    const writeTotal = (label: string, amount: number, isBold: boolean = false) => {
      const row = ws.getRow(startRow);
      row.height = 22;
      row.getCell('H').value = label;
      row.getCell('H').font = { bold: isBold, size: 10 };
      row.getCell('H').alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };

      row.getCell('I').value = amount;
      row.getCell('I').font = { bold: isBold, size: 10 };
      row.getCell('I').numFmt = 'Rp #,##0';
      row.getCell('I').alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
      row.getCell('I').border = THIN_BORDER;
      startRow++;
    };

    writeTotal('Subtotal:', subtotal);
    if ((job.discount || 0) > 0) writeTotal('Discount:', -(job.discount || 0));
    writeTotal('GRAND TOTAL:', Number(job.total_rental_fee), true);

    startRow += 2;

    // ══════════════════════════════════════════════
    //  SECTION 6: Notes & Terbilang
    // ══════════════════════════════════════════════
    const noteRow = ws.getRow(startRow);
    noteRow.getCell('B').value = 'NOTE';
    noteRow.getCell('B').font = { bold: true, size: 10 };
    noteRow.getCell('C').value = ':';
    noteRow.getCell('C').font = { bold: true, size: 10 };
    noteRow.getCell('D').value = 'Termin Pembayaran :';
    noteRow.getCell('D').font = { bold: true, size: 10 };
    startRow++;

    ws.getCell(`D${startRow}`).value = '1. Tahap 1 = 50% dari total of payment';
    ws.getCell(`D${startRow}`).font = { size: 10 };
    startRow++;

    ws.getCell(`D${startRow}`).value = '2. Tahap 2 = 50% dari total of payment pada Pelunasan Saat Pengiriman dan Barang sudah di cek berfungsi normal';
    ws.getCell(`D${startRow}`).font = { size: 10 };
    ws.getCell(`D${startRow}`).alignment = { wrapText: true };
    ws.getRow(startRow).height = 30;
    startRow++;

    ws.getCell(`D${startRow}`).value = '*Harga diatas Belum Termasuk Pajak';
    ws.getCell(`D${startRow}`).font = { size: 10, italic: true };
    startRow += 2;

    const terbilangRow = ws.getRow(startRow);
    terbilangRow.getCell('B').value = 'TERBILANG';
    terbilangRow.getCell('B').font = { bold: true, italic: true, size: 10 };
    terbilangRow.getCell('C').value = ':';
    terbilangRow.getCell('C').font = { size: 10 };
    terbilangRow.getCell('D').value = terbilang(Number(job.total_rental_fee)) + ' Rupiah';
    terbilangRow.getCell('D').font = { bold: true, italic: true, size: 10 };
    ws.mergeCells(`D${startRow}:H${startRow}`);
    startRow += 3;

    // ══════════════════════════════════════════════
    //  SECTION 7: Signatures + Stamp Image
    // ══════════════════════════════════════════════
    const signatureStartRow = startRow;

    ws.getCell(`D${startRow}`).value = 'Hormat Kami,';
    ws.getCell(`D${startRow}`).font = { size: 10 };
    ws.getCell(`D${startRow}`).alignment = { horizontal: 'center' };
    ws.getCell(`H${startRow}`).value = 'Penyewa,';
    ws.getCell(`H${startRow}`).font = { size: 10 };
    ws.getCell(`H${startRow}`).alignment = { horizontal: 'center' };

    // Place stamp image between "Hormat Kami," and the signature line
    if (config.stamp) {
      try {
        const stampImgId = wb.addImage({
          base64: config.stamp,
          extension: detectImageExt(config.stamp),
        });
        // Position stamp under "Hormat Kami," (column D area, ~row signatureStartRow+1)
        ws.addImage(stampImgId, {
          tl: { col: 3, row: signatureStartRow + 0.5 } as any,
          ext: { width: 130, height: 85 },
        });
      } catch (e) {
        console.error('Failed to add stamp image to Excel:', e);
      }
    }

    startRow += 4;
    ws.getCell(`D${startRow}`).value = '( ................................... )';
    ws.getCell(`D${startRow}`).font = { size: 10 };
    ws.getCell(`D${startRow}`).alignment = { horizontal: 'center' };
    ws.getCell(`H${startRow}`).value = `( ${job.client_name} )`;
    ws.getCell(`H${startRow}`).font = { size: 10 };
    ws.getCell(`H${startRow}`).alignment = { horizontal: 'center' };

    // ── Export ──
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${targetSheetName}_${job.client_name.replace(/[^a-zA-Z0-9]/g, '_')}_${docNumber.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
    toast.success(`${targetSheetName} Excel berhasil diunduh`);
  } catch (error: any) {
    console.error('Error generating Excel:', error);
    toast.error('Gagal membuat Excel: ' + error.message);
  }
}

// ============================================================
//  CATALOG IMPORT — template download + parse + insert
//  Items attach to a single supplier (per the SupplierItemsModal
//  context). Packages span suppliers (supplier_name column).
// ============================================================

function styleHeaderRow(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1);
  row.height = 18;
  row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    cell.alignment = { vertical: 'middle' };
  });
}

/** Download the catalog import template (Items, Packages, PackageItems, Petunjuk). */
export async function downloadCatalogTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Beragam Sewa Bali';

  const items = wb.addWorksheet('Items');
  items.columns = [
    { header: 'name', key: 'name', width: 30 },
    { header: 'price', key: 'price', width: 12 },
    { header: 'description', key: 'description', width: 36 },
  ];
  items.addRow({ name: 'Tenda Sarnafil 3x3', price: 150000, description: 'Include pemasangan' });
  styleHeaderRow(items);

  const packages = wb.addWorksheet('Packages');
  packages.columns = [
    { header: 'supplier_name', key: 'supplier_name', width: 24 },
    { header: 'name', key: 'name', width: 30 },
    { header: 'base_price', key: 'base_price', width: 14 },
    { header: 'description', key: 'description', width: 36 },
  ];
  packages.addRow({ supplier_name: 'CV Sumber Rejeki', name: 'Paket Pernikahan A', base_price: 5000000, description: 'Tenda + kursi + meja' });
  styleHeaderRow(packages);

  const pkgItems = wb.addWorksheet('PackageItems');
  pkgItems.columns = [
    { header: 'package_name', key: 'package_name', width: 30 },
    { header: 'item_type', key: 'item_type', width: 14 },
    { header: 'item_name', key: 'item_name', width: 30 },
    { header: 'qty', key: 'qty', width: 8 },
  ];
  pkgItems.addRow({ package_name: 'Paket Pernikahan A', item_type: 'internal', item_name: 'Kursi Tiffany', qty: 100 });
  pkgItems.addRow({ package_name: 'Paket Pernikahan A', item_type: 'supplier', item_name: 'Tenda Sarnafil 3x3', qty: 1 });
  styleHeaderRow(pkgItems);

  const info = wb.addWorksheet('Petunjuk');
  info.getColumn(1).width = 100;
  const lines = [
    ['CARA PAKAI:'],
    ['1. Sheet Items → daftar barang. Di-import dari modal Barang supplier; semua baris menempel ke supplier itu.'],
    ['2. Sheet Packages → daftar paket. supplier_name opsional (kosong = paket internal perusahaan).'],
    ['3. Sheet PackageItems → isi paket. item_type: "internal" (barang inventaris) atau "supplier" (barang supplier).'],
    ['   item_name HARUS cocok persis dengan nama yang sudah ada di sistem.'],
    ['Baris dengan "name" kosong diabaikan. Import hanya menambah data baru; tidak menghapus data lama.'],
  ];
  lines.forEach((l, i) => info.addRow(l).font = { bold: i === 0, size: 11 });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, 'BSB_Catalog_Template.xlsx');
  toast.success('Template katalog berhasil diunduh');
}

/** Read a worksheet into plain row objects keyed by lowercased header. */
function readSheet(ws: ExcelJS.Worksheet | undefined): Record<string, any>[] {
  if (!ws) return [];
  const headerRow = ws.getRow(1);
  const colIndex: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    const h = String(cell.value ?? '').trim().toLowerCase();
    if (h) colIndex[h] = colNumber;
  });
  const rows: Record<string, any>[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const obj: Record<string, any> = {};
    let hasAny = false;
    for (const [key, col] of Object.entries(colIndex)) {
      const raw = row.getCell(col).value;
      const v = raw && typeof raw === 'object' && 'text' in (raw as any) ? (raw as any).text : raw;
      obj[key] = v === undefined || v === null ? '' : String(v).trim();
      if (obj[key] !== '') hasAny = true;
    }
    if (hasAny) rows.push(obj);
  }
  return rows;
}

/** Parse an uploaded catalog workbook into raw row buckets. */
export async function parseCatalogImport(file: File) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  return {
    items: readSheet(wb.getWorksheet('Items')),
    packages: readSheet(wb.getWorksheet('Packages')),
    packageItems: readSheet(wb.getWorksheet('PackageItems')),
  };
}

/** Import Items sheet, attaching every row to the given supplier. */
export async function importSupplierItems(file: File, supplierId: string): Promise<{ inserted: number; skipped: number }> {
  const { items } = await parseCatalogImport(file);
  const clean = items.filter(r => r.name);
  const toInsert = clean.map(r => ({
    supplier_id: supplierId,
    name: r.name,
    price: parseFloat(r.price) || 0,
    description: r.description || null,
  }));
  let inserted = 0;
  if (toInsert.length) {
    const { data, error } = await supabase.from('supplier_items').insert(toInsert).select('id');
    if (error) throw error;
    inserted = data?.length || 0;
  }
  return { inserted, skipped: clean.length - inserted };
}

/** Import Packages + PackageItems, resolving supplier & item names. */
export async function importPackages(file: File): Promise<{ packagesInserted: number; itemsInserted: number; errors: string[] }> {
  const { packages, packageItems } = await parseCatalogImport(file);
  const errors: string[] = [];

  // Build name → id lookup maps
  const [{ data: sups }, { data: internalItems }, { data: supItems }, { data: existingPkgs }] = await Promise.all([
    supabase.from('suppliers').select('id, name').eq('is_deleted', false),
    supabase.from('items').select('id, name'),
    supabase.from('supplier_items').select('id, name'),
    supabase.from('packages').select('id, name'),
  ]);
  const supMap = new Map((sups || []).map((s: any) => [s.name.toLowerCase(), s.id]));
  const internalMap = new Map((internalItems || []).map((i: any) => [i.name.toLowerCase(), i.id]));
  const supItemMap = new Map((supItems || []).map((i: any) => [i.name.toLowerCase(), i.id]));
  const pkgMap = new Map((existingPkgs || []).map((p: any) => [p.name.toLowerCase(), p.id]));

  let packagesInserted = 0;
  let itemsInserted = 0;

  // Insert packages
  for (const p of packages.filter(r => r.name)) {
    const payload: any = { name: p.name, description: p.description || null, base_price: parseFloat(p.base_price) || 0 };
    if (p.supplier_name) {
      const sid = supMap.get(p.supplier_name.toLowerCase());
      if (!sid) { errors.push(`Supplier "${p.supplier_name}" tidak ditemukan (paket "${p.name}").`); continue; }
      payload.supplier_id = sid;
    }
    const { data, error } = await supabase.from('packages').insert(payload).select('id').single();
    if (error) { errors.push(`Gagal tambah paket "${p.name}": ${error.message}`); continue; }
    pkgMap.set(p.name.toLowerCase(), data.id);
    packagesInserted++;
  }

  // Insert package_items
  const pendingItems: any[] = [];
  for (const pi of packageItems.filter(r => r.package_name && r.item_name)) {
    const pkgId = pkgMap.get(pi.package_name.toLowerCase());
    if (!pkgId) { errors.push(`Paket "${pi.package_name}" tidak ditemukan untuk item "${pi.item_name}".`); continue; }
    const isSupplier = String(pi.item_type).toLowerCase() === 'supplier';
    const itemId = isSupplier
      ? supItemMap.get(pi.item_name.toLowerCase())
      : internalMap.get(pi.item_name.toLowerCase());
    if (!itemId) {
      errors.push(`${isSupplier ? 'Barang supplier' : 'Barang internal'} "${pi.item_name}" tidak ditemukan (paket "${pi.package_name}").`);
      continue;
    }
    pendingItems.push({
      package_id: pkgId,
      qty: parseInt(pi.qty) || 1,
      item_id: isSupplier ? null : itemId,
      supplier_item_id: isSupplier ? itemId : null,
    });
  }
  if (pendingItems.length) {
    const { data, error } = await supabase.from('package_items').insert(pendingItems).select('id');
    if (error) errors.push(`Gagal insert sebagian isi paket: ${error.message}`);
    itemsInserted = data?.length || 0;
  }

  return { packagesInserted, itemsInserted, errors };
}

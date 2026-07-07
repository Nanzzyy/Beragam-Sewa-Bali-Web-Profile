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

export async function generateExcel(job: Job, items: any[], type: 'invoice' | 'quotation' | 'receipt') {
  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Beragam Sewa Bali';
    const targetSheetName = type === 'invoice' ? 'INV' : type === 'quotation' ? 'QUO' : 'KWT';
    const ws = wb.addWorksheet(targetSheetName, { views: [{ showGridLines: false }] });

    // Columns setup
    ws.columns = [
      { width: 4 },   // A: Space
      { width: 15 },  // B: Label
      { width: 2 },   // C: Colon
      { width: 35 },  // D: Value
      { width: 20 },  // E: Space middle
      { width: 15 },  // F: Right Label
      { width: 2 },   // G: Colon
      { width: 35 },  // H: Right Value
      { width: 4 }    // I: Space
    ];

    // Fetch config
    const { getCompanyConfig } = await import('./pdf');
    const config = await getCompanyConfig();

    let bankName = 'BCA';
    let bankNumber = '6110252194';
    let bankOwner = 'an. Eka Sutrisna Putra';
    if (config.payment) {
      const paymentStr = config.payment;
      const bankMatch = paymentStr.match(/Bank\s+([A-Za-z0-9]+)/i);
      const numMatch = paymentStr.match(/(?:No\.?\s*Rek\.?\s*)?(\d{5,20})/i);
      const ownerMatch = paymentStr.match(/(?:a\.n\.?|an\.?)\s*([^,\n]+)/i);
      if (bankMatch) bankName = bankMatch[1].toUpperCase();
      if (numMatch) bankNumber = numMatch[1];
      if (ownerMatch) bankOwner = 'an. ' + ownerMatch[1].trim();
    }

    // Pre-fetch package items
    const packageItemsMap: Record<string, any[]> = {};
    for (const item of items) {
      if (item.is_package && item.package_id && !packageItemsMap[item.package_id]) {
        const { data } = await supabase.from('package_items').select('qty, items:item_id(name)').eq('package_id', item.package_id);
        if (data) packageItemsMap[item.package_id] = data;
      }
    }

    // HEADER SPACE
    ws.addRow([]);
    ws.addRow([]);
    ws.addRow([]);

    // 1. Client Info (Left) & Office Info (Right)
    const writeField = (rowNum: number, leftLabel: string, leftVal: string, rightLabel: string, rightVal: string) => {
      const row = ws.getRow(rowNum);
      if (leftLabel) {
        row.getCell('B').value = leftLabel; row.getCell('B').font = { bold: true, size: 10 };
        row.getCell('C').value = ':'; row.getCell('C').font = { bold: true, size: 10 };
        row.getCell('D').value = leftVal; row.getCell('D').font = { size: 10 };
      }
      if (rightLabel) {
        row.getCell('F').value = rightLabel; row.getCell('F').font = { bold: true, size: 10 };
        row.getCell('G').value = ':'; row.getCell('G').font = { bold: true, size: 10 };
        row.getCell('H').value = rightVal; row.getCell('H').font = { size: 10 };
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

    ws.addRow([]);
    
    // 2. Title & Number
    const docTypeLabel = type === 'invoice' ? 'INVOICE' : type === 'quotation' ? 'QUOTATION' : 'KUITANSI';
    const date = new Date(job.created_at || Date.now());
    const docTypeCode = type === 'invoice' ? 'INV' : type === 'quotation' ? 'QUO' : 'KWT';
    const docNumber = `01/BSB/${docTypeCode}/${getRomanMonth(date)}/${date.getFullYear()}`;
    
    const titleRow = ws.getRow(startRow + 1);
    titleRow.getCell('B').value = docTypeLabel;
    titleRow.getCell('B').font = { bold: true, size: 16 };
    titleRow.getCell('H').value = `NO : ${docNumber}`;
    titleRow.getCell('H').font = { bold: true, size: 10 };
    titleRow.getCell('H').alignment = { horizontal: 'right' };
    
    startRow += 3;

    // 3. Table Header
    const headerRow = ws.getRow(startRow);
    headerRow.getCell('B').value = 'NO';
    headerRow.getCell('D').value = 'NAMA ITEM / DESKRIPSI';
    ws.mergeCells(`D${startRow}:E${startRow}`);
    headerRow.getCell('F').value = 'DAYS';
    headerRow.getCell('G').value = 'QTY';
    headerRow.getCell('H').value = 'H. SATUAN';
    headerRow.getCell('I').value = 'TOTAL';
    
    ['B', 'D', 'F', 'G', 'H', 'I'].forEach(col => {
      const cell = headerRow.getCell(col);
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    headerRow.getCell('D').alignment = { horizontal: 'left', vertical: 'middle' };
    
    startRow++;

    // 4. Table Items
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
      
      const total = item.qty * item.days * Number(item.price);
      subtotal += total;

      const row = ws.getRow(startRow);
      row.getCell('B').value = i + 1;
      row.getCell('D').value = displayName;
      ws.mergeCells(`D${startRow}:E${startRow}`);
      row.getCell('F').value = item.days;
      row.getCell('G').value = item.qty;
      row.getCell('H').value = Number(item.price);
      row.getCell('I').value = total;

      ['B', 'D', 'F', 'G', 'H', 'I'].forEach(col => {
        const cell = row.getCell(col);
        cell.alignment = { vertical: 'top', wrapText: true, horizontal: col === 'D' ? 'left' : 'center' };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        if (col === 'H' || col === 'I') cell.numFmt = 'Rp #,##0';
      });
      startRow++;
    }

    // 5. Totals
    const writeTotal = (label: string, amount: number, isBold: boolean = false) => {
      const row = ws.getRow(startRow);
      row.getCell('H').value = label;
      row.getCell('H').font = { bold: isBold };
      row.getCell('H').alignment = { horizontal: 'right' };
      
      row.getCell('I').value = amount;
      row.getCell('I').font = { bold: isBold };
      row.getCell('I').numFmt = 'Rp #,##0';
      row.getCell('I').border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      startRow++;
    };

    writeTotal('Subtotal:', subtotal);
    if ((job.discount || 0) > 0) writeTotal('Discount:', -(job.discount || 0));
    writeTotal('GRAND TOTAL:', Number(job.total_rental_fee), true);

    startRow += 2;

    // 6. Notes & Terbilang
    const noteRow = ws.getRow(startRow);
    noteRow.getCell('B').value = 'NOTE';
    noteRow.getCell('C').value = ':';
    noteRow.getCell('D').value = 'Termin Pembayaran :';
    noteRow.getCell('D').font = { bold: true };
    startRow++;
    
    ws.getCell(`D${startRow++}`).value = '1. Tahap 1 = 50% dari total of payment';
    ws.getCell(`D${startRow}`).value = '2. Tahap 2 = 50% dari total of payment pada Pelunasan Saat Pengiriman dan Barang sudah di cek berfungsi normal';
    ws.getCell(`D${startRow++}`).alignment = { wrapText: true };
    ws.getCell(`D${startRow++}`).value = '*Harga diatas Belum Termasuk Pajak';
    
    startRow++;
    const terbilangRow = ws.getRow(startRow);
    terbilangRow.getCell('B').value = 'TERBILANG';
    terbilangRow.getCell('B').font = { bold: true, italic: true };
    terbilangRow.getCell('C').value = ':';
    terbilangRow.getCell('D').value = terbilang(Number(job.total_rental_fee)) + ' Rupiah';
    terbilangRow.getCell('D').font = { bold: true, italic: true };
    ws.mergeCells(`D${startRow}:H${startRow}`);
    startRow += 3;

    // 7. Signatures
    ws.getCell(`D${startRow}`).value = 'Hormat Kami,';
    ws.getCell(`H${startRow}`).value = 'Penyewa,';
    ws.getCell(`D${startRow}`).alignment = { horizontal: 'center' };
    ws.getCell(`H${startRow}`).alignment = { horizontal: 'center' };
    
    startRow += 4;
    ws.getCell(`D${startRow}`).value = '( ................................... )';
    ws.getCell(`H${startRow}`).value = `( ${job.client_name} )`;
    ws.getCell(`D${startRow}`).alignment = { horizontal: 'center' };
    ws.getCell(`H${startRow}`).alignment = { horizontal: 'center' };

    // Export
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${targetSheetName}_${job.client_name.replace(/[^a-zA-Z0-9]/g, '_')}_${docNumber.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
    toast.success(`${targetSheetName} Excel berhasil diunduh`);
  } catch (error: any) {
    console.error('Error generating Excel:', error);
    toast.error('Gagal membuat Excel: ' + error.message);
  }
}

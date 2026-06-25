import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { Job, JobItem } from './supabase';
import { formatDate } from './supabase';

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

export async function generateExcel(job: Job, items: JobItem[], type: 'invoice' | 'quotation' | 'receipt') {
  try {
    const response = await fetch('/templates/invoice_template.xlsx');
    if (!response.ok) throw new Error('Failed to fetch Excel template from server');
    const arrayBuffer = await response.arrayBuffer();

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);

    const targetSheetName = type === 'invoice' ? 'INV' : type === 'quotation' ? 'QUO' : 'KWT';
    const boqSheet = wb.getWorksheet('BOQ') || wb.getWorksheet('Sheet1') || wb.worksheets[0];
    if (!boqSheet) throw new Error('Worksheet not found in the template');
    boqSheet.name = targetSheetName;

    // Remove all other sheets to keep only 1 worksheet
    wb.worksheets.forEach(sheet => {
      if (sheet.id !== boqSheet.id) {
        wb.removeWorksheet(sheet.id);
      }
    });

    const ws = boqSheet;

    // Fetch config for right column
    const { getCompanyConfig } = await import('./pdf');
    const config = await getCompanyConfig();

    // Parse payment info dynamically
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

    // Client Info
    ws.getCell('C7').value = job.client_name;
    ws.getCell('C8').value = job.client_name; // Contact Person
    ws.getCell('C9').value = job.venue || '-'; // Address
    ws.getCell('C10').value = job.client_email || '-'; // Email
    ws.getCell('C11').value = job.client_phone || '-'; // Phone
    ws.getCell('C12').value = job.description || 'EVENT'; // Project
    ws.getCell('C13').value = `TGL ${formatDate(job.setup_date)} s/d ${formatDate(job.completion_date)}`; // TGL

    // Office Info
    ws.getCell('I8').value = config.address;
    ws.getCell('J8').value = config.address;
    
    ws.getCell('I9').value = config.phone;
    ws.getCell('J9').value = config.phone;

    ws.getCell('I10').value = config.email;
    ws.getCell('J10').value = config.email;

    ws.getCell('I11').value = bankName;
    ws.getCell('J11').value = bankName;

    ws.getCell('I12').value = bankNumber;
    ws.getCell('J12').value = bankNumber;

    ws.getCell('I13').value = bankOwner;
    ws.getCell('J13').value = bankOwner;

    // Clear any leftover values in rows 14-17 (office info columns)
    for (let r = 14; r <= 17; r++) {
      ws.getRow(r).getCell(9).value = null;
      ws.getRow(r).getCell(10).value = null;
    }

    // Document Title and Number
    const title = type.toUpperCase();
    ws.getCell('A15').value = title;
    ws.getCell('C15').value = title;

    const date = new Date(job.created_at || Date.now());
    const docTypeCode = type === 'invoice' ? 'INV' : type === 'quotation' ? 'QUO' : 'KWT';
    const docNo = `NO : 01/BSB/${docTypeCode}/${getRomanMonth(date)}/${date.getFullYear()}`;
    ws.getCell('J15').value = docNo;

    // Clear template rows A18:J41
    for (let r = 18; r <= 41; r++) {
      const row = ws.getRow(r);
      for (let c = 1; c <= 10; c++) {
        row.getCell(c).value = null;
      }
    }

    // Determine if any item has price
    const hasItemizedPricing = items.some(item => (item.sub_rent_cost || 0) > 0);

    // Write Items starting on Row 18
    let currentRow = 18;
    
    items.forEach((item, index) => {
      const row = ws.getRow(currentRow);
      row.getCell(1).value = index + 1;
      row.getCell(3).value = item.item_name || item.item_name_custom || '-';
      row.getCell(4).value = item.quantity;
      row.getCell(5).value = 'unit';
      row.getCell(6).value = 1; // Default 1 day
      row.getCell(7).value = hasItemizedPricing ? (item.sub_rent_cost || 0) : 0;
      
      row.getCell(8).value = { formula: `G${currentRow}*D${currentRow}*F${currentRow}` };
      row.getCell(9).value = { formula: `G${currentRow}*D${currentRow}*F${currentRow}` };
      row.getCell(10).value = { formula: `G${currentRow}*D${currentRow}*F${currentRow}` };
      
      row.getCell(7).numFmt = '#,##0';
      row.getCell(8).numFmt = '#,##0';
      row.getCell(9).numFmt = '#,##0';
      row.getCell(10).numFmt = '#,##0';
      
      currentRow++;
    });

    if (!hasItemizedPricing) {
      // Write package row
      const pkgRow = ws.getRow(currentRow);
      pkgRow.getCell(1).value = items.length + 1;
      pkgRow.getCell(3).value = 'Paket Sewa & Jasa Pengiriman Peralatan';
      pkgRow.getCell(4).value = 1;
      pkgRow.getCell(5).value = 'pkg';
      pkgRow.getCell(6).value = 1;
      pkgRow.getCell(7).value = job.total_rental_fee;
      
      pkgRow.getCell(8).value = { formula: `G${currentRow}*D${currentRow}*F${currentRow}` };
      pkgRow.getCell(9).value = { formula: `G${currentRow}*D${currentRow}*F${currentRow}` };
      pkgRow.getCell(10).value = { formula: `G${currentRow}*D${currentRow}*F${currentRow}` };
      
      pkgRow.getCell(7).numFmt = '#,##0';
      pkgRow.getCell(8).numFmt = '#,##0';
      pkgRow.getCell(9).numFmt = '#,##0';
      pkgRow.getCell(10).numFmt = '#,##0';
    }

    // Totals
    ws.getCell('H42').value = { formula: 'SUM(H18:H41)' };
    ws.getCell('I42').value = { formula: 'SUM(H18:H41)' };
    ws.getCell('J42').value = { formula: 'SUM(H18:H41)' };
    
    ws.getCell('H43').value = 0; // Deposit
    ws.getCell('I43').value = 0;
    ws.getCell('J43').value = 0;
    
    ws.getCell('H44').value = { formula: 'H42-H43' };
    ws.getCell('I44').value = { formula: 'H42-H43' };
    ws.getCell('J44').value = { formula: 'H42-H43' };

    // Terbilang
    const finalTotal = hasItemizedPricing
      ? items.reduce((sum, item) => sum + (item.quantity || 1) * (item.sub_rent_cost || 0), 0)
      : job.total_rental_fee;
    ws.getCell('C51').value = `( ${terbilang(finalTotal)} Rupiah )`;

    // Date and Signatures
    const currentDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    ws.getCell('J46').value = `Denpasar, ${currentDate}`;
    ws.getCell('J47').value = config.name;

    let signatureName = 'Eka Sutrisna Putra';
    if (bankOwner) {
      signatureName = bankOwner.replace(/^(?:a\.n\.?|an\.?)\s*/i, '').trim();
    }
    ws.getCell('J53').value = signatureName;

    // Write Buffer and Save
    const buffer = await wb.xlsx.writeBuffer();
    const filenameType = type.charAt(0).toUpperCase() + type.slice(1);
    saveAs(new Blob([buffer]), `${filenameType}_Excel_${job.client_name.replace(/\s+/g, '_')}_${job.job_date}.xlsx`);
  } catch (error) {
    console.error(`Error generating Excel ${type}:`, error);
    toast.error(`Gagal membuat Excel ${type}: ` + (error as Error).message);
  }
}

export async function generateExcelInvoice(job: Job, items: JobItem[]) {
  return generateExcel(job, items, 'invoice');
}

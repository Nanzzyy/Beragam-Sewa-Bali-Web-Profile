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

export async function generateExcel(job: Job, items: JobItem[], type: 'invoice' | 'quotation' | 'receipt') {
  try {
    const response = await fetch('/templates/invoice_template.xlsx');
    if (!response.ok) throw new Error('Failed to fetch Excel template from server');
    const arrayBuffer = await response.arrayBuffer();

    // Pre-fetch package items
    const packageItemsMap: Record<string, any[]> = {};
    for (const item of items) {
      if (item.is_package && item.package_id && !packageItemsMap[item.package_id]) {
        const { data } = await supabase.from('package_items').select('qty, items:item_id(name)').eq('package_id', item.package_id);
        if (data) packageItemsMap[item.package_id] = data;
      }
    }

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
    ws.getCell('C8').value = job.contact_person || job.client_name; // Contact Person
    ws.getCell('C9').value = job.client_address || '-'; // Address
    ws.getCell('C10').value = job.client_email || '-'; // Email
    ws.getCell('C11').value = job.client_phone || '-'; // Phone
    ws.getCell('C12').value = job.description || 'EVENT'; // Project
    ws.getCell('C13').value = `TGL SETUP: ${formatDate(job.setup_date)} | TGL EVENT: ${formatDate(job.job_date)}`; // TGL
    // Venue
    const hasC14 = ws.getCell('C14');
    hasC14.value = `VENUE: ${job.venue || '-'}`;
    hasC14.alignment = { wrapText: true, vertical: 'middle' };

    // Office Info
    ws.getCell('I8').value = config.address;
    ws.getCell('J8').value = config.address;
    
    ws.getCell('I9').value = config.phone;
    ws.getCell('J9').value = config.phone;

    ws.getCell('I10').value = config.email;
    ws.getCell('J10').value = config.email;

    // NPWP row
    if (config.npwp) {
      ws.getCell('I11').value = `NPWP: ${config.npwp}`;
      ws.getCell('J11').value = `NPWP: ${config.npwp}`;
      ws.getCell('I12').value = bankName;
      ws.getCell('J12').value = bankName;
      ws.getCell('I13').value = bankNumber;
      ws.getCell('J13').value = bankNumber;
    } else {
      ws.getCell('I11').value = bankName;
      ws.getCell('J11').value = bankName;
      ws.getCell('I12').value = bankNumber;
      ws.getCell('J12').value = bankNumber;
      ws.getCell('I13').value = bankOwner;
      ws.getCell('J13').value = bankOwner;
    }

    // Apply text wrapping to prevent overlapping text
    const wrapCells = ['C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13', 'I8', 'J8', 'I9', 'J9', 'I10', 'J10', 'I11', 'J11', 'I12', 'J12', 'I13', 'J13'];
    wrapCells.forEach(c => {
      const cell = ws.getCell(c);
      cell.alignment = { ...cell.alignment, wrapText: true, vertical: 'middle' };
      const rowNum = parseInt(c.replace(/[A-Z]/g, ''), 10);
      (ws.getRow(rowNum) as any).height = undefined; // auto-height
    });

    // Clear any leftover values in rows 14-17 (office info columns)
    for (let r = 14; r <= 17; r++) {
      ws.getRow(r).getCell(9).value = null;
      ws.getRow(r).getCell(10).value = null;
    }

    // Document Title and Number
    const title = type.toUpperCase();
    ws.getCell('A15').value = title;
    ws.getCell('C15').value = title;

    // Images: header replacement + stamp from config
    const images = ws.getImages();
    if (images.length >= 1) {
      // images[0] is the header. Replace if config.header exists
      if (config.header && typeof config.header === 'string') {
        const parts = config.header.split(',');
        if (parts.length >= 2) {
          const base64Data = parts[1];
          const extMatch = config.header.match(/data:image\/(.+);/);
          const ext = extMatch ? extMatch[1] : 'png';
          const imageId = wb.addImage({
            base64: base64Data,
            extension: (ext === 'jpeg' ? 'jpeg' : 'png') as any,
          });
          images[0].imageId = imageId as unknown as string;
        }
      }
    }

    // Stamp from config: positioned between J46 (date) and J53 (company name)
    if (config.stamp && typeof config.stamp === 'string') {
      const stampParts = config.stamp.split(',');
      if (stampParts.length >= 2) {
        const stampBase64 = stampParts[1];
        const stampExtMatch = config.stamp.match(/data:image\/(.+);/);
        const stampExt = stampExtMatch ? stampExtMatch[1] : 'png';
        const stampId = wb.addImage({
          base64: stampBase64,
          extension: (stampExt === 'jpeg' ? 'jpeg' : 'png') as any,
        });
        ws.addImage(stampId, {
          tl: { col: 9, row: 47 } as any, // J48 between date (J46) and name (J53)
          ext: { width: 100, height: 70 },
          editAs: 'oneCell',
        });
      }
    } else if (images.length >= 2) {
      // fallback: reposition existing stamp image
      images[1].range.tl.nativeCol = 9;
      images[1].range.tl.nativeRow = 46;
    }

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
      const isPackage = !!item.is_package;
      let displayName = item.item_name || item.item_name_custom || '-';
      if (isPackage) {
        // Just use package name without sub-items for clean Excel view
        displayName = item.item_name || item.item_name_custom || 'Paket';
      }

      row.getCell(1).value = index + 1;
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

      row.getCell(3).value = displayName;
      // Bold only the package name
      row.getCell(3).font = isPackage ? { bold: true } : { bold: false };
      row.getCell(3).alignment = { wrapText: true, vertical: 'middle' };

      row.getCell(4).value = item.quantity;
      row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

      row.getCell(5).value = isPackage ? 'pkg' : 'unit';
      row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

      row.getCell(6).value = item.days || 1;
      row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };

      row.getCell(7).value = item.sub_rent_cost > 0 ? item.sub_rent_cost : 0;
      row.getCell(7).numFmt = '#,##0';
      row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(7).font = { bold: false };
      
      row.getCell(8).value = { formula: `G${currentRow}*D${currentRow}*F${currentRow}` };
      row.getCell(8).numFmt = '#,##0';
      row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(8).font = { bold: false };

      row.getCell(9).value = { formula: `G${currentRow}*D${currentRow}*F${currentRow}` };
      row.getCell(9).numFmt = '#,##0';
      row.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };

      row.getCell(10).value = { formula: `G${currentRow}*D${currentRow}*F${currentRow}` };
      row.getCell(10).numFmt = '#,##0';
      row.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };
      
      (row as any).height = 20;
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
      
      pkgRow.getCell(3).alignment = { ...pkgRow.getCell(3).alignment, wrapText: true, vertical: 'middle' };
      (pkgRow as any).height = undefined;

      pkgRow.getCell(7).numFmt = '#,##0';
      pkgRow.getCell(8).numFmt = '#,##0';
      pkgRow.getCell(9).numFmt = '#,##0';
      pkgRow.getCell(10).numFmt = '#,##0';
    }

    let totalTagihan = job.total_rental_fee;
    let pphAmount = 0;
    if (job.pph_umkm_enabled) {
      pphAmount = job.total_rental_fee * 0.005;
      totalTagihan = job.total_rental_fee - pphAmount;
    }

    // Totals — Sub Total
    const fmtNum = '#,##0';
    const applyRight = (addr: string, val: number) => {
      const c = ws.getCell(addr);
      c.value = val;
      c.numFmt = fmtNum;
      c.alignment = { horizontal: 'right', vertical: 'middle' };
    };

    applyRight('H42', job.total_rental_fee);
    applyRight('I42', job.total_rental_fee);
    applyRight('J42', job.total_rental_fee);
    
    // Discount row
    if (job.discount && job.discount > 0) {
      ws.getCell('F43').value = 'DISCOUNT';
      applyRight('H43', job.discount);
      applyRight('I43', job.discount);
      applyRight('J43', job.discount);
    } else {
      applyRight('H43', 0);
      applyRight('I43', 0);
      applyRight('J43', 0);
    }
    
    // PPh UMKM
    if (job.pph_umkm_enabled) {
      ws.getCell('F44').value = 'PPh UMKM 0.5%';
      applyRight('H44', pphAmount);
      applyRight('I44', pphAmount);
      applyRight('J44', pphAmount);
    } else {
      ws.getCell('F44').value = 'PPh UMKM 0.5%';
      applyRight('H44', 0);
      applyRight('I44', 0);
      applyRight('J44', 0);
    }

    // Total of Payment row (H45)
    ws.getCell('F45').value = 'Total of Payment';
    ws.getCell('F45').font = { bold: true };
    applyRight('H45', totalTagihan);
    applyRight('I45', totalTagihan);
    applyRight('J45', totalTagihan);
    ws.getCell('H45').font = { bold: true };
    ws.getCell('J45').font = { bold: true };

    // Date and Signatures
    const currentDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    ws.getCell('J46').value = `Denpasar, ${currentDate}`;
    ws.getCell('J47').value = null; // Clear to make room for stamp
    ws.getCell('J53').value = config.tax_name || config.name;
    if (config.npwp) {
      ws.getCell('J54').value = `NPWP: ${config.npwp}`;
    }

    // Terbilang
    const terbilangCell = ws.getCell('C51');
    terbilangCell.value = `( ${terbilang(totalTagihan)} Rupiah )`;
    terbilangCell.alignment = { wrapText: true, vertical: 'top' };
    (ws.getRow(51) as any).height = 30;

    // Adjust row and column sizing for better spacing
    ws.columns.forEach(col => {
      if (col && col.width) {
        col.width = col.width + 1.5;
      }
    });
    ws.eachRow(row => {
      if (row.height) {
        row.height = row.height + 4;
      } else {
        row.height = 20;
      }
    });

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

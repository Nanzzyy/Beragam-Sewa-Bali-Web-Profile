import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { Job, JobItem } from './supabase';
import { formatDate } from './supabase';

export async function generateExcelInvoice(job: Job, items: JobItem[]) {
  try {
    // 1. Fetch template as arraybuffer
    const response = await fetch('/templates/invoice_template.xlsx');
    if (!response.ok) throw new Error('Failed to fetch Excel template from server');
    const arrayBuffer = await response.arrayBuffer();

    // 2. Load into ExcelJS Workbook
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);

    // 3. Get BOQ Worksheet
    const ws = wb.getWorksheet('BOQ');
    if (!ws) throw new Error('Worksheet "BOQ" not found in the template');

    // 4. Fill Header / Client Info
    ws.getCell('C7').value = job.client_name;
    ws.getCell('C8').value = job.client_name; // Contact Person
    
    // Office Address (merged I8:J8)
    ws.getCell('I8').value = job.venue;
    ws.getCell('J8').value = job.venue;
    
    // Phone (merged I9:J9)
    ws.getCell('I9').value = job.client_phone || '-';
    ws.getCell('J9').value = job.client_phone || '-';
    
    // Email (merged I10:J10)
    if (job.client_email) {
      const emailObj = { text: job.client_email, hyperlink: `mailto:${job.client_email}` };
      ws.getCell('I10').value = emailObj;
      ws.getCell('J10').value = emailObj;
    } else {
      ws.getCell('I10').value = '-';
      ws.getCell('J10').value = '-';
    }
    
    ws.getCell('C11').value = job.client_phone || '-';
    ws.getCell('C12').value = `EVENT DI ${job.venue.toUpperCase()}`;
    ws.getCell('C13').value = `TGL ${formatDate(job.setup_date)} s/d ${formatDate(job.completion_date)}`;
    
    // Invoice Number
    const invNo = `NO : ${job.id.substring(0, 8).toUpperCase()}/BSB/INV/${new Date(job.job_date).getMonth() + 1}/${new Date(job.job_date).getFullYear()}`;
    ws.getCell('J15').value = invNo;

    // 5. Clear original placeholder items in the template table (rows 18 to 41, columns A to J)
    for (let r = 18; r <= 41; r++) {
      const row = ws.getRow(r);
      for (let c = 1; c <= 10; c++) {
        row.getCell(c).value = null;
      }
    }

    // 6. Write Group Title on Row 18
    const groupHeaderRow = ws.getRow(18);
    groupHeaderRow.getCell(1).value = 1;
    groupHeaderRow.getCell(2).value = `Sewa Peralatan Event - ${job.venue}`;
    groupHeaderRow.getCell(3).value = `Sewa Peralatan Event - ${job.venue}`;
    
    // 7. Write Items starting on Row 19
    let currentRow = 19;
    items.forEach((item) => {
      const row = ws.getRow(currentRow);
      row.getCell(3).value = item.item_name || item.item_name_custom || '-';
      row.getCell(4).value = item.quantity;
      row.getCell(5).value = 'unit';
      row.getCell(6).value = 1; // Default 1 day
      row.getCell(7).value = 0; // Itemized pricing is packet-based
      
      // Calculate Total via Excel formulas
      row.getCell(8).value = { formula: `G${currentRow}*D${currentRow}*F${currentRow}` };
      row.getCell(9).value = { formula: `G${currentRow}*D${currentRow}*F${currentRow}` };
      row.getCell(10).value = { formula: `G${currentRow}*D${currentRow}*F${currentRow}` };
      
      row.getCell(7).numFmt = '#,##0';
      row.getCell(8).numFmt = '#,##0';
      row.getCell(9).numFmt = '#,##0';
      row.getCell(10).numFmt = '#,##0';
      
      currentRow++;
    });

    // 8. Write the package price (representing total_rental_fee) on the next row
    const pkgRow = ws.getRow(currentRow);
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

    // 9. Update Sub Total, Discount, and Total of Payment Formulas
    // Row 42: Sub Total
    ws.getCell('H42').value = { formula: 'SUM(J18:J41)' };
    ws.getCell('I42').value = { formula: 'SUM(J18:J41)' };
    ws.getCell('J42').value = { formula: 'SUM(J18:J41)' };

    // Row 43: Discount/Deposit
    ws.getCell('H43').value = 0;
    ws.getCell('I43').value = 0;
    ws.getCell('J43').value = 0;

    // Row 44: Total of Payment
    ws.getCell('H44').value = { formula: 'J42-J43' };
    ws.getCell('I44').value = { formula: 'J42-J43' };
    ws.getCell('J44').value = { formula: 'J42-J43' };

    // 10. Update Date in Signature Box (J46)
    const currentDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    ws.getCell('J46').value = `Denpasar, ${currentDate}`;

    // 11. Write Buffer and Save
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Invoice_Excel_${job.client_name.replace(/\s+/g, '_')}_${job.job_date}.xlsx`);
  } catch (error) {
    console.error('Error generating Excel Invoice:', error);
    alert('Gagal membuat invoice Excel: ' + (error as Error).message);
  }
}

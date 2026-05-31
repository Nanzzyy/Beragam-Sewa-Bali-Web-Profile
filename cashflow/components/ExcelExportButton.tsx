'use client';

import React from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface Transaction {
  id: string;
  transaction_date: string;
  type: 'inflow' | 'outflow';
  category_name: string;
  amount: number;
  description: string;
}

interface ExcelExportButtonProps {
  transactions: Transaction[];
}

export const ExcelExportButton: React.FC<ExcelExportButtonProps> = ({ transactions }) => {
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Cashflow Ledger', {
      views: [{ showGridLines: true }]
    });

    // 1. Column definitions
    worksheet.columns = [
      { header: 'No', key: 'no', width: 8 },
      { header: 'Tanggal', key: 'date', width: 22 },
      { header: 'Jenis', key: 'type', width: 14 },
      { header: 'Kategori', key: 'category', width: 22 },
      { header: 'Jumlah (IDR)', key: 'amount', width: 20 },
      { header: 'Deskripsi / Catatan', key: 'description', width: 35 }
    ];

    // 2. Format Header Row (Dark Blue background, white bold text)
    const headerRow = worksheet.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1E3A8A' } // Dark Blue
      };
      cell.font = {
        name: 'Segoe UI',
        bold: true,
        color: { argb: 'FFFFFF' },
        size: 11
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center'
      };
      cell.border = {
        top: { style: 'medium', color: { argb: '000000' } },
        bottom: { style: 'medium', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: 'D3D3D3' } },
        right: { style: 'thin', color: { argb: 'D3D3D3' } }
      };
    });

    // 3. Populate rows with formatting
    transactions.forEach((tx, idx) => {
      const row = worksheet.addRow({
        no: idx + 1,
        date: new Date(tx.transaction_date).toLocaleString('id-ID'),
        type: tx.type === 'inflow' ? 'Pemasukan (Inflow)' : 'Pengeluaran (Outflow)',
        category: tx.category_name,
        amount: Number(tx.amount),
        description: tx.description || '-'
      });

      row.height = 22;

      // Apply Segoe UI to normal rows
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
          left: { style: 'thin', color: { argb: 'E2E8F0' } },
          right: { style: 'thin', color: { argb: 'E2E8F0' } }
        };
        
        // Alignment
        if (colNumber === 1 || colNumber === 3) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 5) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          // Number formatting for IDR currency (Rp #,##0)
          cell.numFormat = 'Rp" "#,##0';
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });
    });

    // 4. Summary Row (Total Balance SUM Formulas)
    const summaryRowIndex = transactions.length + 2;
    const totalLabelRow = worksheet.getRow(summaryRowIndex);
    totalLabelRow.getCell(4).value = 'Total Pemasukan:';
    totalLabelRow.getCell(4).font = { name: 'Segoe UI', bold: true };
    totalLabelRow.getCell(5).value = {
      formula: `SUMIF(C2:C${summaryRowIndex - 1}, "Pemasukan (Inflow)", E2:E${summaryRowIndex - 1})`,
      date1904: false
    };
    totalLabelRow.getCell(5).font = { name: 'Segoe UI', bold: true };
    totalLabelRow.getCell(5).numFormat = 'Rp" "#,##0';

    const outflowLabelRow = worksheet.getRow(summaryRowIndex + 1);
    outflowLabelRow.getCell(4).value = 'Total Pengeluaran:';
    outflowLabelRow.getCell(4).font = { name: 'Segoe UI', bold: true };
    outflowLabelRow.getCell(5).value = {
      formula: `SUMIF(C2:C${summaryRowIndex - 1}, "Pengeluaran (Outflow)", E2:E${summaryRowIndex - 1})`,
      date1904: false
    };
    outflowLabelRow.getCell(5).font = { name: 'Segoe UI', bold: true };
    outflowLabelRow.getCell(5).numFormat = 'Rp" "#,##0';

    const netLabelRow = worksheet.getRow(summaryRowIndex + 2);
    netLabelRow.getCell(4).value = 'Saldo Bersih (Net):';
    netLabelRow.getCell(4).font = { name: 'Segoe UI', bold: true, color: { argb: '1E3A8A' } };
    netLabelRow.getCell(5).value = {
      formula: `E${summaryRowIndex} - E${summaryRowIndex + 1}`,
      date1904: false
    };
    netLabelRow.getCell(5).font = { name: 'Segoe UI', bold: true, color: { argb: '1E3A8A' } };
    netLabelRow.getCell(5).numFormat = 'Rp" "#,##0';

    // Apply double border to bottom of Net row
    netLabelRow.getCell(4).border = { bottom: { style: 'double', color: { argb: '1E3A8A' } } };
    netLabelRow.getCell(5).border = { bottom: { style: 'double', color: { argb: '1E3A8A' } } };

    // 5. Generate Buffer and Save
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `BSB_Cashflow_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <button
      onClick={exportToExcel}
      className="flex items_center justify_center gap_2 px_4 py_2.5 bg_emerald_600 hover:bg_emerald_500 active:scale_95 transition_all text_white font_semibold rounded_lg shadow_md text_sm"
    >
      <svg className="w_4 h_4 fill_current" viewBox="0 0 24 24">
        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
      </svg>
      Ekspor Excel
    </button>
  );
};

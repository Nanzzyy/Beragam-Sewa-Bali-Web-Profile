'use client';

import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { TrialBalanceRow } from '../lib/supabase';

interface Props {
  trialBalance: TrialBalanceRow[];
}

export default function ExcelExportButton({ trialBalance }: Props) {
  const [exporting, setExporting] = useState(false);

  const exportToExcel = async () => {
    if (trialBalance.length === 0) return;
    setExporting(true);

    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'BSB Cashflow — PT Praven Bali Production';
      wb.created = new Date();

      const ws = wb.addWorksheet('Neraca Saldo', { views: [{ showGridLines: true }] });

      // Title rows
      ws.mergeCells('A1:F1');
      const titleCell = ws.getCell('A1');
      titleCell.value = 'NERACA SALDO (TRIAL BALANCE)';
      titleCell.font = { name: 'Segoe UI', bold: true, size: 14, color: { argb: '1E3A8A' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      ws.mergeCells('A2:F2');
      const subtitleCell = ws.getCell('A2');
      subtitleCell.value = `PT Praven Bali Production — ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
      subtitleCell.font = { name: 'Segoe UI', size: 10, color: { argb: '64748B' } };
      subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Empty row
      ws.getRow(3).height = 8;

      // Column definitions
      ws.columns = [
        { key: 'code', width: 14 },
        { key: 'name', width: 36 },
        { key: 'category', width: 16 },
        { key: 'debit', width: 22 },
        { key: 'credit', width: 22 },
        { key: 'balance', width: 22 },
      ];

      // Header row (row 4)
      const headerRow = ws.getRow(4);
      headerRow.values = ['Kode Akun', 'Nama Akun', 'Kategori', 'Total Debit', 'Total Credit', 'Saldo Akhir'];
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
        cell.font = { name: 'Segoe UI', bold: true, color: { argb: 'FFFFFF' }, size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'medium', color: { argb: '334155' } },
          bottom: { style: 'medium', color: { argb: '334155' } },
          left: { style: 'thin', color: { argb: '334155' } },
          right: { style: 'thin', color: { argb: '334155' } },
        };
      });

      // Data rows
      trialBalance.forEach((row) => {
        const r = ws.addRow({
          code: row.account_code,
          name: row.account_name,
          category: row.category,
          debit: row.total_debit,
          credit: row.total_credit,
          balance: row.ending_balance,
        });
        r.height = 24;
        r.eachCell((cell, colNum) => {
          cell.font = { name: 'Segoe UI', size: 10 };
          cell.border = {
            top: { style: 'thin', color: { argb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
            left: { style: 'thin', color: { argb: 'E2E8F0' } },
            right: { style: 'thin', color: { argb: 'E2E8F0' } },
          };
          if (colNum >= 4) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '#,##0';
          } else if (colNum === 1) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.font = { name: 'Segoe UI Semibold', size: 10, bold: true };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        });
      });

      // SUM row
      const sumRowIdx = 4 + trialBalance.length + 1;
      const sumRow = ws.getRow(sumRowIdx);
      sumRow.getCell(1).value = '';
      sumRow.getCell(2).value = '';
      sumRow.getCell(3).value = 'TOTAL';
      sumRow.getCell(3).font = { name: 'Segoe UI', bold: true, size: 11 };
      sumRow.getCell(4).value = { formula: `SUM(D5:D${sumRowIdx - 1})` };
      sumRow.getCell(5).value = { formula: `SUM(E5:E${sumRowIdx - 1})` };
      sumRow.getCell(6).value = { formula: `SUM(F5:F${sumRowIdx - 1})` };

      for (let c = 3; c <= 6; c++) {
        const cell = sumRow.getCell(c);
        cell.font = { name: 'Segoe UI', bold: true, size: 11, color: { argb: '1E3A8A' } };
        cell.border = {
          top: { style: 'double', color: { argb: '1E3A8A' } },
          bottom: { style: 'double', color: { argb: '1E3A8A' } },
        };
        if (c >= 4) {
          cell.numFmt = '#,##0';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
      }

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer]),
        `BSB_NeracaSaldo_${new Date().toISOString().split('T')[0]}.xlsx`
      );
    } catch (err) {
      console.error('Export error:', err);
      alert('Gagal mengekspor Excel. Silakan coba lagi.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      id="btn-export-excel"
      onClick={exportToExcel}
      disabled={exporting || trialBalance.length === 0}
      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 text-sm"
    >
      {exporting ? (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
        </svg>
      )}
      {exporting ? 'Mengekspor...' : 'Ekspor Excel'}
    </button>
  );
}

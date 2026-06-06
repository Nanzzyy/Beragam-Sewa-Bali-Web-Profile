'use client';

import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { TrialBalanceRow } from '../lib/supabase';
import { Download, Loader2 } from 'lucide-react';

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
      headerRow.values = ['KODE', 'NAMA AKUN', 'KATEGORI', 'DEBIT', 'KREDIT', 'SALDO AKHIR'];
      headerRow.height = 24;
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
        cell.font = { name: 'Inter', bold: true, color: { argb: '475569' }, size: 9 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          bottom: { style: 'medium', color: { argb: 'E2E8F0' } },
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
        r.height = 20;
        r.eachCell((cell, colNum) => {
          cell.font = { name: 'Inter', size: 9, color: { argb: '0F172A' } };
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'F1F5F9' } },
          };
          if (colNum >= 4) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '#,##0';
          } else if (colNum === 1) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.font = { name: 'Inter', size: 9, bold: true, color: { argb: '64748B' } };
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
        cell.font = { name: 'Inter', bold: true, size: 10, color: { argb: '0F172A' } };
        cell.border = {
          top: { style: 'medium', color: { argb: '94A3B8' } },
          bottom: { style: 'double', color: { argb: '94A3B8' } },
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
      className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-semibold rounded-lg shadow-sm text-xs"
    >
      {exporting ? (
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
      ) : (
        <Download className="w-4 h-4 text-emerald-600" />
      )}
      {exporting ? 'Mengekspor...' : 'Unduh Excel'}
    </button>
  );
}

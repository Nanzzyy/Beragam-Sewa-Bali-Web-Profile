'use client';

import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { TrialBalanceRow } from '../lib/supabase';
import { fetchTransactionsWithEntries, fetchAccounts, fetchFixedAssets } from '../lib/accounting';
import { Download, Loader2 } from 'lucide-react';

interface Props {
  trialBalance: TrialBalanceRow[];
  userRole?: string;
  currentUserId?: string;
}

export default function ExcelExportButton({ trialBalance, userRole = 'guest', currentUserId = '' }: Props) {
  const [exporting, setExporting] = useState(false);

  const exportToExcel = async () => {
    setExporting(true);

    try {
      // Fetch all required data for other sheets
      let [transactions, accounts, fixedAssets] = await Promise.all([
        fetchTransactionsWithEntries(),
        fetchAccounts(),
        fetchFixedAssets()
      ]);

      if (userRole === 'guest' && currentUserId) {
        transactions = transactions.filter(tx => tx.created_by === currentUserId);
        fixedAssets = [];
      }

      const wb = new ExcelJS.Workbook();
      wb.creator = 'BSB Cashflow — PT Praven Bali Production';
      wb.created = new Date();
      const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

      // 1. SHEET: NERACA SALDO
      if (trialBalance.length > 0) {
        const wsNS = wb.addWorksheet('Neraca Saldo', { views: [{ showGridLines: true }] });
        wsNS.mergeCells('A1:F1');
        const titleCell = wsNS.getCell('A1');
        titleCell.value = 'NERACA SALDO (TRIAL BALANCE)';
        titleCell.font = { name: 'Segoe UI', bold: true, size: 14, color: { argb: '1E3A8A' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        wsNS.mergeCells('A2:F2');
        const subtitleCell = wsNS.getCell('A2');
        subtitleCell.value = `PT Praven Bali Production — ${dateStr}`;
        subtitleCell.font = { name: 'Segoe UI', size: 10, color: { argb: '64748B' } };
        subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        wsNS.getRow(3).height = 8;

        wsNS.columns = [
          { key: 'code', width: 14 },
          { key: 'name', width: 36 },
          { key: 'category', width: 16 },
          { key: 'debit', width: 22 },
          { key: 'credit', width: 22 },
          { key: 'balance', width: 22 },
        ];

        const headerRow = wsNS.getRow(4);
        headerRow.values = ['KODE', 'NAMA AKUN', 'KATEGORI', 'DEBIT', 'KREDIT', 'SALDO AKHIR'];
        headerRow.height = 24;
        headerRow.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
          cell.font = { name: 'Inter', bold: true, color: { argb: '475569' }, size: 9 };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = { bottom: { style: 'medium', color: { argb: 'E2E8F0' } } };
        });

        let tbDebit = 0;
        let tbCredit = 0;

        trialBalance.forEach((row) => {
          const r = wsNS.addRow({
            code: row.account_code,
            name: row.account_name,
            category: row.category,
            debit: row.total_debit,
            credit: row.total_credit,
            balance: row.ending_balance,
          });
          tbDebit += row.total_debit;
          tbCredit += row.total_credit;
          
          r.height = 20;
          r.eachCell((cell, colNum) => {
            cell.font = { name: 'Inter', size: 9, color: { argb: '0F172A' } };
            cell.border = { bottom: { style: 'thin', color: { argb: 'F1F5F9' } } };
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

        const sumRowIdx = 4 + trialBalance.length + 1;
        const sumRow = wsNS.getRow(sumRowIdx);
        sumRow.getCell(3).value = 'TOTAL';
        sumRow.getCell(3).font = { name: 'Segoe UI', bold: true, size: 11 };
        sumRow.getCell(4).value = tbDebit;
        sumRow.getCell(5).value = tbCredit;
        sumRow.getCell(6).value = tbDebit - tbCredit;

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
      }

      // 2. SHEET: JURNAL UMUM
      if (transactions.length > 0) {
        const wsJU = wb.addWorksheet('Jurnal Umum');
        wsJU.mergeCells('A1:E1');
        wsJU.getCell('A1').value = 'JURNAL UMUM (GENERAL LEDGER)';
        wsJU.getCell('A1').font = { name: 'Segoe UI', bold: true, size: 14, color: { argb: '1E3A8A' } };
        wsJU.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
        
        wsJU.mergeCells('A2:E2');
        wsJU.getCell('A2').value = `PT Praven Bali Production — ${dateStr}`;
        wsJU.getCell('A2').font = { name: 'Segoe UI', size: 10, color: { argb: '64748B' } };
        wsJU.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

        wsJU.getRow(3).height = 8;

        wsJU.columns = [
          { key: 'date', width: 14 },
          { key: 'desc', width: 45 },
          { key: 'ref', width: 14 },
          { key: 'debit', width: 20 },
          { key: 'credit', width: 20 },
        ];

        const headerRow = wsJU.getRow(4);
        headerRow.values = ['TANGGAL', 'KETERANGAN', 'REF', 'DEBIT', 'KREDIT'];
        headerRow.height = 24;
        headerRow.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
          cell.font = { name: 'Inter', bold: true, color: { argb: '475569' }, size: 9 };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = { bottom: { style: 'medium', color: { argb: 'E2E8F0' } } };
        });

        transactions.forEach((tx) => {
          const date = new Date(tx.date).toLocaleDateString('id-ID');
          
          // Row for Transaction Description
          const descRow = wsJU.addRow({
            date: date,
            desc: tx.description,
            ref: '', debit: '', credit: ''
          });
          descRow.font = { name: 'Inter', bold: true, size: 9 };
          descRow.getCell(2).alignment = { horizontal: 'left' };
          
          // Entries
          tx.journal_entries?.forEach((je) => {
            const entryRow = wsJU.addRow({
              date: '',
              desc: je.debit > 0 ? je.account_name : `    ${je.account_name}`,
              ref: je.account_code,
              debit: je.debit > 0 ? je.debit : '',
              credit: je.credit > 0 ? je.credit : '',
            });
            entryRow.font = { name: 'Inter', size: 9 };
            entryRow.getCell(4).numFmt = '#,##0';
            entryRow.getCell(5).numFmt = '#,##0';
            entryRow.getCell(3).alignment = { horizontal: 'center' };
            entryRow.getCell(4).alignment = { horizontal: 'right' };
            entryRow.getCell(5).alignment = { horizontal: 'right' };
            entryRow.border = { bottom: { style: 'thin', color: { argb: 'F1F5F9' } } };
          });
          
          // Empty row between transactions
          wsJU.addRow([]);
        });
      }

      // 3. SHEET: DAFTAR AKUN
      if (accounts.length > 0) {
        const wsAcc = wb.addWorksheet('Daftar Akun');
        wsAcc.columns = [
          { header: 'KODE AKUN', key: 'code', width: 15 },
          { header: 'NAMA AKUN', key: 'name', width: 40 },
          { header: 'KATEGORI', key: 'cat', width: 20 },
          { header: 'SALDO NORMAL', key: 'nb', width: 15 }
        ];
        wsAcc.getRow(1).font = { name: 'Inter', bold: true, size: 10 };
        wsAcc.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
        
        accounts.forEach(a => {
          wsAcc.addRow({ code: a.account_code, name: a.account_name, cat: a.category, nb: a.normal_balance });
        });
      }

      // 4. SHEET: AKTIVA TETAP
      if (fixedAssets.length > 0) {
        const wsFA = wb.addWorksheet('Aktiva Tetap');
        wsFA.columns = [
          { header: 'KODE', key: 'code', width: 12 },
          { header: 'NAMA ASET', key: 'name', width: 35 },
          { header: 'TANGGAL BELI', key: 'date', width: 18 },
          { header: 'HARGA PEROLEHAN', key: 'cost', width: 22 },
          { header: 'UMUR (THN)', key: 'life', width: 15 },
          { header: 'NILAI RESIDU', key: 'salvage', width: 22 }
        ];
        wsFA.getRow(1).font = { name: 'Inter', bold: true, size: 10 };
        wsFA.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
        
        fixedAssets.forEach(fa => {
          const row = wsFA.addRow({
            code: fa.asset_code,
            name: fa.asset_name,
            date: new Date(fa.purchase_date).toLocaleDateString('id-ID'),
            cost: fa.purchase_cost,
            life: fa.useful_life,
            salvage: fa.salvage_value
          });
          row.getCell(4).numFmt = '#,##0';
          row.getCell(6).numFmt = '#,##0';
        });
      }

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer]),
        `Laporan_Keuangan_BSB_${new Date().toISOString().split('T')[0]}.xlsx`
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
      disabled={exporting}
      className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800/60 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-semibold rounded-lg shadow-sm text-xs"
    >
      {exporting ? (
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
      ) : (
        <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      )}
      {exporting ? 'Mengekspor...' : 'Unduh Laporan'}
    </button>
  );
}

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';
import { defaultTemplate, ELEMENT_LABELS, ELEMENT_COLORS } from '../lib/pdf-template';
import type { PDFTemplateLayout, PDFElementPosition } from '../lib/pdf-template';

const COLUMNS = 42;
const CELL_MM = 5;
const CANVAS_W = 840;
const CANVAS_H = 1188;

interface PDFTemplateEditorProps {
  template: PDFTemplateLayout;
  onChange: (template: PDFTemplateLayout) => void;
}

const elementKeys: (keyof PDFTemplateLayout)[] = [
  'headerImage', 'companyLogo', 'documentTitle', 'companyInfo',
  'clientInfo', 'officeInfo', 'itemsTable', 'totals',
  'notes', 'terbilang', 'signatures', 'stamp'
];

function toGrid(pos: PDFElementPosition) {
  return {
    x: Math.round(pos.x / CELL_MM),
    y: Math.round(pos.y / CELL_MM),
    w: Math.max(2, Math.round(pos.width / CELL_MM)),
    h: Math.max(1, Math.round(pos.height / CELL_MM)),
  };
}

function fromGrid(x: number, y: number, w: number, h: number): PDFElementPosition {
  return { x: x * CELL_MM, y: y * CELL_MM, width: w * CELL_MM, height: h * CELL_MM };
}

function buildWidgetHTML(key: string, label: string, color: string) {
  return `
    <div class="grid-stack-item-content" style="background:${color};border:2px solid rgba(0,0,0,0.1);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#374151;cursor:move;overflow:hidden;text-align:center;padding:4px 8px;line-height:1.2;user-select:none;position:relative;">
      <span style="pointer-events:none;">${label}</span>
      <button class="gs-delete-btn" data-gs-delete="${key}" title="Hapus widget" style="position:absolute;top:2px;right:2px;background:#ef4444;color:#fff;border:none;border-radius:3px;width:18px;height:18px;font-size:12px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;z-index:10;">✕</button>
    </div>
  `;
}

export default function PDFTemplateEditor({ template, onChange }: PDFTemplateEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<any>(null);
  const initializedRef = useRef(false);

  const syncTemplate = useCallback(() => {
    if (!gridRef.current) return;
    const updated = { ...template } as Record<string, any>;

    elementKeys.forEach((key) => {
      const widget = gridRef.current!.getGridItems?.()?.find(
        (el: HTMLElement) => el.getAttribute('data-gs-id') === key
      );
      if (widget) {
        const gsX = parseInt(widget.getAttribute('gs-x') || '0');
        const gsY = parseInt(widget.getAttribute('gs-y') || '0');
        const gsW = parseInt(widget.getAttribute('gs-w') || '2');
        const gsH = parseInt(widget.getAttribute('gs-h') || '1');
        const el = (updated as any)[key] as PDFElementPosition & { enabled?: boolean; fontSize?: number };
        const np = fromGrid(gsX, gsY, gsW, gsH);
        el.x = np.x; el.y = np.y; el.width = np.width; el.height = np.height;
      }
    });

    onChange(updated as PDFTemplateLayout);
  }, [template, onChange]);

  const renderWidgets = useCallback((grid: any, tpl: PDFTemplateLayout) => {
    elementKeys.forEach((key) => {
      const el = (tpl as any)[key] as PDFElementPosition & { enabled?: boolean; fontSize?: number };
      if (!el.enabled) return;

      const gs = toGrid(el);
      const label = ELEMENT_LABELS[key] || key;
      const color = ELEMENT_COLORS[key] || '#f3f4f6';

      const widgetEl = document.createElement('div');
      widgetEl.className = 'grid-stack-item';
      widgetEl.setAttribute('gs-id', key as string);
      widgetEl.setAttribute('gs-x', String(gs.x));
      widgetEl.setAttribute('gs-y', String(gs.y));
      widgetEl.setAttribute('gs-w', String(gs.w));
      widgetEl.setAttribute('gs-h', String(gs.h));
      widgetEl.innerHTML = buildWidgetHTML(key as string, label, color);
      grid.makeWidget(widgetEl);
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const grid = GridStack.init({
      column: COLUMNS,
      cellHeight: Math.round(CANVAS_H / 60),
      margin: 0,
      float: false,
      animate: false,
      minRow: 1,
      maxRow: 60,
      resizable: { handles: 'e,se,s,sw,w' },
      draggable: { handle: '.grid-stack-item-content' },
    } as any, containerRef.current);

    gridRef.current = grid;
    renderWidgets(grid, template);

    grid.on('change', () => syncTemplate());

    const handleDelete = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('.gs-delete-btn') as HTMLElement;
      if (!btn || !gridRef.current) return;
      e.stopPropagation();
      const key = btn.getAttribute('data-gs-delete');
      if (!key) return;
      const widget = gridRef.current.getGridItems?.()?.find(
        (el: HTMLElement) => el.getAttribute('data-gs-id') === key
      );
      if (widget) {
        gridRef.current.removeWidget(widget, false);
        const updated = { ...template } as any;
        if (updated[key]) (updated[key] as any).enabled = false;
        onChange(updated as PDFTemplateLayout);
      }
    };

    containerRef.current.addEventListener('click', handleDelete);

    return () => {
      containerRef.current?.removeEventListener('click', handleDelete);
      grid.destroy(false);
      gridRef.current = null;
      initializedRef.current = false;
    };
  }, []);

  const toggleElement = (key: string) => {
    if (!gridRef.current) return;

    const updated = { ...template } as any;
    const el = updated[key] as PDFElementPosition & { enabled?: boolean; fontSize?: number };
    el.enabled = !el.enabled;

    if (el.enabled) {
      if (el.width === 0) {
        const def = defaultTemplate(template.documentType) as any;
        const defEl = def[key] as PDFElementPosition & { enabled?: boolean; fontSize?: number };
        el.x = defEl.x;
        el.y = defEl.y;
        el.width = defEl.width || 30;
        el.height = defEl.height || 10;
      }

      const gs = toGrid(el);
      const label = ELEMENT_LABELS[key] || key;
      const color = ELEMENT_COLORS[key] || '#f3f4f6';

      const widgetEl = document.createElement('div');
      widgetEl.className = 'grid-stack-item';
      widgetEl.setAttribute('gs-id', key);
      widgetEl.setAttribute('gs-x', String(gs.x));
      widgetEl.setAttribute('gs-y', String(gs.y));
      widgetEl.setAttribute('gs-w', String(gs.w));
      widgetEl.setAttribute('gs-h', String(gs.h));
      widgetEl.innerHTML = buildWidgetHTML(key, label, color);
      gridRef.current.makeWidget(widgetEl);
    } else {
      const widget = gridRef.current.getGridItems?.()?.find(
        (el: HTMLElement) => el.getAttribute('data-gs-id') === key
      );
      if (widget) gridRef.current.removeWidget(widget, false);
    }

    onChange(updated as PDFTemplateLayout);
  };

  const resetTemplate = () => {
    if (gridRef.current) {
      gridRef.current.removeAll(false);
      gridRef.current.destroy(false);
    }
    initializedRef.current = false;

    const fresh = defaultTemplate(template.documentType);
    onChange(fresh);

    setTimeout(() => {
      if (!containerRef.current) return;
      if (gridRef.current) {
        gridRef.current.removeAll(false);
        gridRef.current.destroy(false);
      }
      const grid = GridStack.init({
        column: COLUMNS,
        cellHeight: Math.round(CANVAS_H / 60),
        margin: 0,
        float: false,
        animate: false,
        minRow: 1,
        maxRow: 60,
        resizable: { handles: 'e,se,s,sw,w' },
        draggable: { handle: '.grid-stack-item-content' },
      } as any, containerRef.current);
      gridRef.current = grid;
      initializedRef.current = true;
      renderWidgets(grid, fresh);

      grid.on('change', () => syncTemplate());

      const handleDelete = (e: MouseEvent) => {
        const btn = (e.target as HTMLElement).closest('.gs-delete-btn') as HTMLElement;
        if (!btn || !gridRef.current) return;
        e.stopPropagation();
        const key = btn.getAttribute('data-gs-delete');
        if (!key) return;
        const widget = gridRef.current.getGridItems?.()?.find(
          (el: HTMLElement) => el.getAttribute('data-gs-id') === key
        );
        if (widget) {
          gridRef.current.removeWidget(widget, false);
          const u = { ...fresh } as any;
          if (u[key]) (u[key] as any).enabled = false;
          onChange(u as PDFTemplateLayout);
        }
      };
      containerRef.current.addEventListener('click', handleDelete);
    }, 50);
  };

  return (
    <div className="flex gap-4 items-start">
      <div className="w-52 shrink-0 space-y-1">
        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Elemen PDF</h4>
        {elementKeys.map((key) => {
          const el = (template as any)[key] as PDFElementPosition & { enabled?: boolean };
          return (
            <button
              key={key}
              onClick={() => toggleElement(key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                el.enabled
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: el.enabled ? ELEMENT_COLORS[key] : '#e5e7eb' }}
              />
              {ELEMENT_LABELS[key]}
            </button>
          );
        })}
        <button
          onClick={resetTemplate}
          className="w-full mt-3 px-3 py-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-500/20 transition border border-transparent hover:border-red-200 dark:hover:border-red-500/20"
        >
          ↺ Reset Layout
        </button>
        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
          Klik elemen untuk toggle. Drag widget di canvas untuk atur posisi. Resize dari sudut kanan-bawah. Klik ✕ di pojok widget untuk hapus.
        </p>
      </div>

      <div className="flex-1 min-w-0">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase">A4 Canvas — 210mm × 297mm</span>
            <span className="text-xs text-slate-400">Drag geser · Resize sudut · ✕ hapus</span>
          </div>
          <div
            ref={containerRef}
            className="grid-stack mx-auto"
            style={{
              width: `${CANVAS_W}px`,
              minHeight: `${CANVAS_H}px`,
              background: '#fff',
              border: '2px solid #d1d5db',
              borderRadius: '4px',
              position: 'relative',
            }}
          />
        </div>
      </div>
    </div>
  );
}

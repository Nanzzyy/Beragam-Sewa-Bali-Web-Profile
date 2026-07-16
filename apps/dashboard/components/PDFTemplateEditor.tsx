'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';
import { defaultTemplate, ELEMENT_LABELS, ELEMENT_COLORS } from '../lib/pdf-template';
import type { PDFTemplateLayout, PDFElementPosition } from '../lib/pdf-template';

const COLUMNS = 42;
const CELL_PX = 20;
const MARGIN = 4;
const CANVAS_W = COLUMNS * CELL_PX + (COLUMNS - 1) * MARGIN;
const CANVAS_H = 60 * CELL_PX + 59 * MARGIN;

const MM_PER_COL = 5;

interface PDFTemplateEditorProps {
  template: PDFTemplateLayout;
  onChange: (template: PDFTemplateLayout) => void;
}

const elementKeys: (keyof PDFTemplateLayout)[] = [
  'headerImage','companyLogo','documentTitle','companyInfo',
  'clientInfo','officeInfo','itemsTable','totals',
  'notes','terbilang','signatures','stamp'
];

function toGrid(pos: PDFElementPosition) {
  return {
    x: Math.max(0, Math.round(pos.x / MM_PER_COL)),
    y: Math.max(0, Math.round(pos.y / MM_PER_COL)),
    w: Math.max(2, Math.min(Math.round(pos.width / MM_PER_COL), COLUMNS)),
    h: Math.max(1, Math.min(Math.round(pos.height / MM_PER_COL), 60)),
  };
}

function fromGrid(x: number, y: number, w: number, h: number): PDFElementPosition {
  return { x: x * MM_PER_COL, y: y * MM_PER_COL, width: w * MM_PER_COL, height: h * MM_PER_COL };
}

function makeWidgetEl(key: string, gs: ReturnType<typeof toGrid>) {
  const label = ELEMENT_LABELS[key] || key;
  const color = ELEMENT_COLORS[key] || '#f3f4f6';
  const el = document.createElement('div');
  el.className = 'grid-stack-item';
  el.setAttribute('gs-id', key);
  el.setAttribute('data-gs-key', key);
  el.setAttribute('gs-x', String(gs.x));
  el.setAttribute('gs-y', String(gs.y));
  el.setAttribute('gs-w', String(gs.w));
  el.setAttribute('gs-h', String(gs.h));
  el.style.overflow = 'visible';
  if (key === 'stamp') el.style.zIndex = '99';
  el.innerHTML = `<div class="grid-stack-item-content gs-content" style="background:${color};border:2px solid rgba(0,0,0,0.12);border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:#1f2937;cursor:move;overflow:hidden;text-align:center;padding:4px 6px;line-height:1.2;user-select:none;height:100%;box-sizing:border-box;"><span style="pointer-events:none;">${label}</span></div><button class="gs-del" data-gs-key="${key}" title="Hapus" style="position:absolute;top:2px;right:2px;background:#ef4444;color:#fff;border:none;border-radius:3px;width:16px;height:16px;font-size:11px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;z-index:20;opacity:0;transition:opacity 0.15s;">✕</button>`;
  return el;
}

export default function PDFTemplateEditor({ template, onChange }: PDFTemplateEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<any>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const emitChange = useCallback((grid: any) => {
    const updated = { ...template } as Record<string, any>;
    elementKeys.forEach((key) => {
      const w = grid.getGridItems?.()?.find(
        (el: HTMLElement) => el.getAttribute('data-gs-key') === key
      );
      if (w) {
        const gx = Math.max(0, Math.min(COLUMNS - 1, parseInt(w.getAttribute('gs-x') || '0')));
        const gy = Math.max(0, parseInt(w.getAttribute('gs-y') || '0'));
        const gw = parseInt(w.getAttribute('gs-w') || '2');
        const gh = parseInt(w.getAttribute('gs-h') || '1');
        Object.assign(updated[key], fromGrid(gx, gy, gw, gh));
      }
    });
    onChange(updated as PDFTemplateLayout);
  }, [template, onChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    // cleanup previous
    if (cleanupRef.current) cleanupRef.current();
    if (gridRef.current) { gridRef.current.destroy(false); gridRef.current = null; }
    containerRef.current.innerHTML = '';

    const grid = GridStack.init({
      column: COLUMNS,
      cellHeight: CELL_PX,
      margin: MARGIN,
      float: true,
      animate: false,
      minRow: 1,
      maxRow: 60,
      resizable: { handles: 'e,se,s,sw,w' },
      draggable: { handle: '.gs-content' },
    } as any, containerRef.current);

    gridRef.current = grid;

    elementKeys.forEach((key) => {
      const el = (template as any)[key] as PDFElementPosition & { enabled?: boolean };
      if (!el.enabled) return;
      grid.makeWidget(makeWidgetEl(key, toGrid(el)));
    });

    grid.on('change', () => emitChange(grid));

    const onDel = (e: Event) => {
      const btn = (e.target as HTMLElement).closest('.gs-del');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const key = btn.getAttribute('data-gs-key');
      if (!key || !gridRef.current) return;
      const w = gridRef.current.getGridItems?.()?.find(
        (el: HTMLElement) => el.getAttribute('data-gs-key') === key
      );
      if (w) gridRef.current.removeWidget(w, true);
      const upd = { ...template } as any;
      if (upd[key]) (upd[key] as any).enabled = false;
      onChange(upd as PDFTemplateLayout);
    };
    containerRef.current.addEventListener('click', onDel);
    cleanupRef.current = () => containerRef.current?.removeEventListener('click', onDel);

    return () => {
      if (cleanupRef.current) cleanupRef.current();
      if (gridRef.current) { gridRef.current.destroy(false); gridRef.current = null; }
    };
  }, [template, emitChange, onChange]);

  const toggleElement = (key: string) => {
    const el = (template as any)[key] as PDFElementPosition & { enabled?: boolean; fontSize?: number };
    if (el.enabled) {
      // remove
      const upd = { ...template } as any;
      (upd[key] as any).enabled = false;
      onChange(upd as PDFTemplateLayout);
      return;
    }
    // add
    if (el.width === 0) {
      const def = defaultTemplate(template.documentType) as any;
      const defEl = def[key];
      el.x = defEl.x || 0;
      el.y = defEl.y || 0;
      el.width = defEl.width || 30;
      el.height = defEl.height || 10;
    }
    const upd = { ...template } as any;
    (upd[key] as any).enabled = true;
    onChange(upd as PDFTemplateLayout);
  };

  const resetTemplate = () => {
    onChange(defaultTemplate(template.documentType));
  };

  return (
    <div className="flex gap-4 items-start">
      <div className="w-52 shrink-0 space-y-1">
        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Elemen PDF</h4>
        {elementKeys.map((key) => {
          const el = (template as any)[key] as PDFElementPosition & { enabled?: boolean };
          return (
            <button key={key} onClick={() => toggleElement(key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${el.enabled ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: el.enabled ? ELEMENT_COLORS[key] : '#e5e7eb' }} />
              {ELEMENT_LABELS[key]}
            </button>
          );
        })}
        <button onClick={resetTemplate} className="w-full mt-3 px-3 py-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-500/20 transition">↺ Reset Layout</button>
        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">Klik untuk toggle. Drag widget. Resize sudut. ✕ hapus.</p>
      </div>

      <div className="flex-1 min-w-0">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase">A4 — 210×297mm</span>
            <span className="text-xs text-slate-400">Scroll untuk lihat penuh · Drag/resize widget</span>
          </div>
          <div className="overflow-auto rounded border border-slate-200 dark:border-slate-700" style={{ maxHeight: '70vh' }}>
            <div ref={containerRef} className="grid-stack mx-auto" style={{ width: `${CANVAS_W}px`, height: `${CANVAS_H}px`, background: '#fff', position: 'relative' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

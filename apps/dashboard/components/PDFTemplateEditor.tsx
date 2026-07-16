'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';
import { defaultTemplate, ELEMENT_LABELS, ELEMENT_COLORS } from '../lib/pdf-template';
import type { PDFTemplateLayout, PDFElementPosition } from '../lib/pdf-template';

interface PDFTemplateEditorProps {
  template: PDFTemplateLayout;
  onChange: (template: PDFTemplateLayout) => void;
}

const elementKeys = [
  'headerImage', 'companyLogo', 'documentTitle', 'companyInfo',
  'clientInfo', 'officeInfo', 'itemsTable', 'totals',
  'notes', 'terbilang', 'signatures', 'stamp'
] as (keyof PDFTemplateLayout)[];

export default function PDFTemplateEditor({ template, onChange }: PDFTemplateEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<any>(null);
  const [initialized, setInitialized] = useState(false);

  const toGridPos = useCallback((pos: PDFElementPosition) => ({
    x: Math.round(pos.x / 5),
    y: Math.round(pos.y / 5),
    w: Math.max(2, Math.round(pos.width / 5)),
    h: Math.max(1, Math.round(pos.height / 5)),
  }), []);

  const fromGridPos = useCallback((x: number, y: number, w: number, h: number): PDFElementPosition => ({
    x: x * 5,
    y: y * 5,
    width: w * 5,
    height: h * 5,
  }), []);

  const syncTemplate = useCallback(() => {
    if (!gridRef.current) return;
    const updated = { ...template } as Record<string, any>;

    elementKeys.forEach((key) => {
      const widget = (gridRef.current! as any).getGridItems()?.find(
        (el: HTMLElement) => el.getAttribute('data-gs-id') === key
      );
      if (widget) {
        const gsX = parseInt(widget.getAttribute('gs-x') || '0');
        const gsY = parseInt(widget.getAttribute('gs-y') || '0');
        const gsW = parseInt(widget.getAttribute('gs-w') || '2');
        const gsH = parseInt(widget.getAttribute('gs-h') || '1');

      const el = (updated as any)[key] as PDFElementPosition & { enabled?: boolean; fontSize?: number };
        const newPos = fromGridPos(gsX, gsY, gsW, gsH);
        el.x = newPos.x;
        el.y = newPos.y;
        el.width = newPos.width;
        el.height = newPos.height;
      }
    });

    onChange(updated as PDFTemplateLayout);
  }, [template, onChange, fromGridPos]);

  useEffect(() => {
    if (!containerRef.current || initialized) return;

    const grid = GridStack.init({
      column: 42,
      cellHeight: 5,
      margin: 0,
      float: false,
      animate: false,
      minRow: 1,
      maxRow: 60,
      resizable: { handles: 'e,se,s,sw,w' },
      draggable: { handle: '.grid-stack-item-content' },
    } as any, containerRef.current);

    gridRef.current = grid;

    elementKeys.forEach((key) => {
      const el = (template as any)[key] as PDFElementPosition & { enabled?: boolean; fontSize?: number };
      if (!el.enabled) return;

      const gs = toGridPos(el);
      const label = ELEMENT_LABELS[key] || key;
      const color = ELEMENT_COLORS[key] || '#f3f4f6';

      const widgetEl = document.createElement('div');
      widgetEl.className = 'grid-stack-item';
      widgetEl.setAttribute('gs-id', key);
      widgetEl.setAttribute('gs-x', String(gs.x));
      widgetEl.setAttribute('gs-y', String(gs.y));
      widgetEl.setAttribute('gs-w', String(gs.w));
      widgetEl.setAttribute('gs-h', String(gs.h));
      widgetEl.setAttribute('gs-no-resize', 'false');
      widgetEl.setAttribute('gs-no-move', 'false');

      widgetEl.innerHTML = `
        <div class="grid-stack-item-content" style="background:${color};border:2px solid rgba(0,0,0,0.1);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:#374151;cursor:move;overflow:hidden;text-align:center;padding:2px;line-height:1.2;user-select:none;">
          ${el.fontSize ? `<span style="font-size:12px;font-weight:700;">📄</span> ` : ''}${label}
        </div>
      `;

      grid.addWidget(widgetEl);
    });

    grid.on('change', () => {
      syncTemplate();
    });

    setInitialized(true);

    return () => {
      grid.destroy(false);
      gridRef.current = null;
      setInitialized(false);
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

      const gs = toGridPos(el);
      const label = ELEMENT_LABELS[key] || key;
      const color = ELEMENT_COLORS[key] || '#f3f4f6';

      const widgetEl = document.createElement('div');
      widgetEl.className = 'grid-stack-item';
      widgetEl.setAttribute('gs-id', key);
      widgetEl.setAttribute('gs-x', String(gs.x));
      widgetEl.setAttribute('gs-y', String(gs.y));
      widgetEl.setAttribute('gs-w', String(gs.w));
      widgetEl.setAttribute('gs-h', String(gs.h));

      widgetEl.innerHTML = `
        <div class="grid-stack-item-content" style="background:${color};border:2px solid rgba(0,0,0,0.1);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:#374151;cursor:move;overflow:hidden;text-align:center;padding:2px;line-height:1.2;user-select:none;">
          ${el.fontSize ? `<span style="font-size:12px;font-weight:700;">📄</span> ` : ''}${label}
        </div>
      `;

      gridRef.current.addWidget(widgetEl);
    } else {
      const widget = gridRef.current.getGridItems?.()?.find(
        (el: HTMLElement) => el.getAttribute('data-gs-id') === key
      );
      if (widget) {
        gridRef.current.removeWidget(widget, false);
      }
    }

    onChange(updated as PDFTemplateLayout);
  };

  const resetTemplate = () => {
    if (gridRef.current) {
      gridRef.current.removeAll(false);
    }
    const fresh = defaultTemplate(template.documentType);
    onChange(fresh);
    setInitialized(false);

    setTimeout(() => {
      if (gridRef.current) {
        gridRef.current.removeAll(false);
      }
      if (containerRef.current) {
        const grid = GridStack.init({
          column: 42,
          cellHeight: 5,
          margin: 0,
          float: false,
          animate: false,
          minRow: 1,
          maxRow: 60,
          resizable: { handles: 'e,se,s,sw,w' },
          draggable: { handle: '.grid-stack-item-content' },
        } as any, containerRef.current);
        gridRef.current = grid;

        elementKeys.forEach((key) => {
          const el = (fresh as any)[key] as PDFElementPosition & { enabled?: boolean; fontSize?: number };
          if (!el.enabled) return;

          const gs = toGridPos(el);
          const label = ELEMENT_LABELS[key] || key;
          const color = ELEMENT_COLORS[key] || '#f3f4f6';

          const widgetEl = document.createElement('div');
          widgetEl.className = 'grid-stack-item';
          widgetEl.setAttribute('gs-id', key);
          widgetEl.setAttribute('gs-x', String(gs.x));
          widgetEl.setAttribute('gs-y', String(gs.y));
          widgetEl.setAttribute('gs-w', String(gs.w));
          widgetEl.setAttribute('gs-h', String(gs.h));

          widgetEl.innerHTML = `
            <div class="grid-stack-item-content" style="background:${color};border:2px solid rgba(0,0,0,0.1);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:#374151;cursor:move;overflow:hidden;text-align:center;padding:2px;line-height:1.2;user-select:none;">
              ${el.fontSize ? `<span style="font-size:12px;font-weight:700;">📄</span> ` : ''}${label}
            </div>
          `;

          grid.addWidget(widgetEl);
        });

        grid.on('change', () => syncTemplate());
        setInitialized(true);
      }
    }, 50);
  };

  return (
    <div className="flex gap-4">
      {/* Toggle Panel */}
      <div className="w-48 shrink-0 space-y-1">
        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Elemen PDF</h4>
        {elementKeys.map((key) => {
          const el = (template as any)[key] as PDFElementPosition & { enabled?: boolean };
          return (
            <button
              key={key}
              onClick={() => toggleElement(key)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 ${
                el.enabled
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
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
          className="w-full mt-3 px-3 py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-500/20 transition"
        >
          Reset Layout
        </button>
      </div>

      {/* A4 Canvas */}
      <div className="flex-1">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase">A4 Canvas (210mm × 297mm)</span>
            <span className="text-xs text-slate-400">Drag untuk geser, resize dari sudut</span>
          </div>
          <div
            ref={containerRef}
            className="grid-stack"
            style={{
              width: '630px',
              height: '892px',
              background: '#fff',
              border: '2px solid #e5e7eb',
              borderRadius: '4px',
              position: 'relative',
              margin: '0 auto',
            }}
          />
        </div>
      </div>
    </div>
  );
}

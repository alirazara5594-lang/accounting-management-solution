import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileCode,
  Printer,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { Button } from './ui/button';

export interface ExportOption {
  key: 'pdf' | 'excel' | 'csv' | 'print' | string;
  label: string;
  sublabel?: string;
  extension?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  iconBg?: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface ExportDropdownProps {
  onPDF?: () => void;
  onExcel?: () => void;
  onCSV?: () => void;
  onPrint?: () => void;
  customOptions?: ExportOption[];
  disabled?: boolean;
  label?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  align?: 'left' | 'right';
  className?: string;
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  onPDF,
  onExcel,
  onCSV,
  onPrint,
  customOptions,
  disabled = false,
  label = 'Export',
  variant = 'default',
  size = 'sm',
  align = 'right',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateCoords = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 288; // w-72 = 288px
    let left = align === 'right' ? rect.right - menuWidth : rect.left;
    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }
    const top = rect.bottom + 6;
    setCoords({ top, left });
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      const handleScrollOrResize = () => {
        updateCoords();
      };
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isOpen, align]);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const defaultOptions: ExportOption[] = [];

  if (onPDF) {
    defaultOptions.push({
      key: 'pdf',
      label: 'PDF Document',
      sublabel: 'Official formatted statement & audit print',
      extension: '.pdf',
      icon: FileText,
      iconColor: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-500/10 border-rose-500/20 text-rose-600',
      onClick: onPDF,
    });
  }

  if (onExcel) {
    defaultOptions.push({
      key: 'excel',
      label: 'Excel Spreadsheet',
      sublabel: 'Multi-sheet workbook & formula-ready',
      extension: '.xlsx',
      icon: FileSpreadsheet,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600',
      onClick: onExcel,
    });
  }

  if (onCSV) {
    defaultOptions.push({
      key: 'csv',
      label: 'CSV Data Sheet',
      sublabel: 'Raw comma-separated dataset for BI/DB',
      extension: '.csv',
      icon: FileCode,
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-500/10 border-blue-500/20 text-blue-600',
      onClick: onCSV,
    });
  }

  if (onPrint) {
    defaultOptions.push({
      key: 'print',
      label: 'Print Preview',
      sublabel: 'Optimized high-resolution print view',
      extension: 'Ctrl+P',
      icon: Printer,
      iconColor: 'text-slate-600 dark:text-slate-400',
      iconBg: 'bg-slate-500/10 border-slate-500/20 text-slate-600',
      onClick: onPrint,
    });
  }

  const options = customOptions || defaultOptions;

  return (
    <div ref={buttonRef as any} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <Button
        type="button"
        size={size}
        variant={variant === 'default' ? undefined : (variant as any)}
        disabled={disabled}
        onClick={() => {
          if (!isOpen) updateCoords();
          setIsOpen(!isOpen);
        }}
        className={`font-bold text-xs h-9 px-3.5 gap-2 shadow-xs cursor-pointer transition-all ${
          variant === 'default'
            ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white border border-teal-500/30'
            : ''
        } ${isOpen ? 'ring-2 ring-teal-500 ring-offset-1' : ''}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Download className="w-4 h-4" />
        <span>{label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </Button>

      {/* Modern Popover Hub portaled to body with high z-index to prevent clipping */}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 99999,
            }}
            className="w-72 rounded-2xl border border-border/80 bg-popover/98 backdrop-blur-xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150 text-popover-foreground"
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-border/60 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-teal-600" /> Export & Share
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {options.length} format{options.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Options List */}
            <div className="py-1 space-y-0.5">
              {options.map((opt) => {
                const Icon = opt.icon || Download;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => {
                      setIsOpen(false);
                      opt.onClick();
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-muted/70 active:bg-muted transition-all flex items-start gap-3 cursor-pointer group disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-105 ${
                        opt.iconBg || 'bg-muted border-border text-foreground'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${opt.iconColor || ''}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-bold text-foreground group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors truncate">
                          {opt.label}
                        </span>
                        {opt.extension && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground shrink-0 border border-border/50">
                            {opt.extension}
                          </span>
                        )}
                      </div>
                      {opt.sublabel && (
                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">
                          {opt.sublabel}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default ExportDropdown;

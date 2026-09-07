import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, Percent } from 'lucide-react'
import type { TaxCodeOption } from '../lib/taxLocalization'

interface CompactTaxSelectProps {
  value: string | number
  onChange: (value: string) => void
  taxCodes: TaxCodeOption[]
  className?: string
}

export const CompactTaxSelect: React.FC<CompactTaxSelectProps> = ({
  value,
  onChange,
  taxCodes,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const numVal = parseFloat(String(value || 0))
  const selectedCode = taxCodes.find(tc => tc.rate === numVal)

  const updateCoords = () => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const menuWidth = 288 // 18rem / w-72
    const menuHeight = Math.min(260, taxCodes.length * 44 + 40)

    // Position horizontally aligned with right edge of button if possible
    let left = rect.right - menuWidth
    if (left < 8) left = 8
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8
    }

    // Check if enough space below, otherwise pop above
    let top = rect.bottom + 4
    if (top + menuHeight > window.innerHeight - 8 && rect.top > menuHeight + 8) {
      top = rect.top - menuHeight - 4
    }

    setCoords({ top, left })
  }

  useEffect(() => {
    if (isOpen) {
      updateCoords()
      const handleScrollOrResize = () => updateCoords()
      window.addEventListener('scroll', handleScrollOrResize, true)
      window.addEventListener('resize', handleScrollOrResize)
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true)
        window.removeEventListener('resize', handleScrollOrResize)
      }
    }
  }, [isOpen])

  // Close on outside click or Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
      document.addEventListener('touchstart', handleOutsideClick)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className="relative inline-block w-full">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!isOpen) updateCoords()
          setIsOpen(!isOpen)
        }}
        title={selectedCode ? `${selectedCode.label} (${selectedCode.rate}%)` : `${numVal}% Tax`}
        className={`w-full h-8 px-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)] text-xs font-semibold text-[var(--color-text-strong)] flex items-center justify-between gap-1 transition-colors outline-none cursor-pointer ${
          isOpen ? 'ring-2 ring-indigo-500/50 border-indigo-500' : ''
        } ${className}`}
      >
        <span className="font-mono text-center flex-1">{numVal}%</span>
        <ChevronDown
          className={`w-3 h-3 text-[var(--color-text-muted)] transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180 text-indigo-500' : ''
          }`}
        />
      </button>

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
            className="w-72 max-h-64 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-1.5 divide-y divide-[var(--color-border)]/60 animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center justify-between">
              <span>Select Tax Rate</span>
              <Percent className="w-3 h-3 text-indigo-500" />
            </div>
            <div className="py-1 space-y-0.5">
              {taxCodes.map((tc) => {
                const isSelected = tc.rate === numVal
                return (
                  <button
                    key={tc.code}
                    type="button"
                    onClick={() => {
                      onChange(String(tc.rate))
                      setIsOpen(false)
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'hover:bg-[var(--color-surface-muted)] text-[var(--color-text-strong)]'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="truncate font-medium text-[11px] leading-tight text-[var(--color-text-strong)]">
                        {tc.label}
                      </div>
                      {tc.authority && (
                        <div className="text-[9px] text-[var(--color-text-muted)] mt-0.5 font-mono">
                          {tc.authority}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono font-bold text-xs bg-indigo-500/10 dark:bg-indigo-400/10 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400">
                        {tc.rate}%
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

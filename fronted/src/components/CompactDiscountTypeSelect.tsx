import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'

interface CompactDiscountTypeSelectProps {
  value: number // 0 for %, 1 for Currency
  onChange: (value: number) => void
  currencyCode: string
  className?: string
}

export const CompactDiscountTypeSelect: React.FC<CompactDiscountTypeSelectProps> = ({
  value,
  onChange,
  currencyCode,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const label = value === 0 ? '%' : currencyCode

  const updateCoords = () => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const menuWidth = 144
    const menuHeight = 85

    let left = rect.left
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8
    }
    if (left < 8) left = 8

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

  const options = [
    { value: 0, label: '%', desc: 'Percentage' },
    { value: 1, label: currencyCode, desc: 'Fixed Amount' }
  ]

  return (
    <div className="relative inline-block shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!isOpen) updateCoords()
          setIsOpen(!isOpen)
        }}
        className={`h-8 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)] text-xs font-bold text-[var(--color-text-strong)] flex items-center justify-center gap-1 cursor-pointer transition-colors shrink-0 outline-none select-none ${
          isOpen ? 'ring-2 ring-indigo-500/50 border-indigo-500' : ''
        } ${className}`}
      >
        <span>{label}</span>
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
            className="w-36 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-1 animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="p-0.5 space-y-0.5">
              {options.map((opt) => {
                const isSelected = opt.value === value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value)
                      setIsOpen(false)
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between gap-1.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold'
                        : 'hover:bg-[var(--color-surface-muted)] text-[var(--color-text-strong)]'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">{opt.label}</div>
                      <div className="text-[9px] text-[var(--color-text-muted)] font-normal">{opt.desc}</div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
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
